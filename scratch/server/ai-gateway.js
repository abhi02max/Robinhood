/**
 * AI Gateway - Resilient Multi-Provider Orchestration Layer
 * 
 * Provider fallback order:
 * 1. Gemini (Primary - fastest, preferred)
 * 2. OpenRouter (Secondary - fallback)
 * 3. Ollama (Tertiary - local fallback)
 * 
 * Features:
 * - Automatic failover with exponential backoff
 * - Redis-based response caching
 * - Rate limiting per user
 * - SSE streaming support
 * - Comprehensive observability logging
 */

import { createHash } from 'crypto';

// Provider configurations
const PROVIDERS = {
  gemini: {
    name: 'Gemini',
    priority: 1,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    timeout: 4000,
    retries: 0,
  },
  openrouter: {
    name: 'OpenRouter',
    priority: 2,
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: process.env.AI_MODEL || 'openrouter/free',
    timeout: 6000,
    retries: 0,
  },
  ollama: {
    name: 'Ollama',
    priority: 3,
    baseUrl: process.env.OLLAMA_URL || 'http://ollama:11434',
    defaultModel: 'qwen2.5-coder:7b',
    timeout: 15000,
    retries: 1,
  },
};

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: Math.max(1, Number(process.env.AI_RATE_LIMIT_MAX || 5)),
  windowSeconds: Math.max(1, Number(process.env.AI_RATE_LIMIT_WINDOW_SECONDS || 30)),
  cooldownSeconds: Math.max(1, Number(process.env.AI_RATE_LIMIT_COOLDOWN_SECONDS || 60)),
};

// Cache configuration
const CACHE_TTL_SECONDS = 600; // 10 minutes
const AI_DEFAULT_MAX_LATENCY_MS = 12000; // Max 12s total budget
const AI_PROVIDER_COOLDOWN_SECONDS = 30; // 30s normal cooldown
const AI_PROVIDER_AUTH_COOLDOWN_SECONDS = 60; // 60s for rate limit/auth
const AI_DAILY_REQUEST_LIMIT = Math.max(1, Number(process.env.AI_DAILY_REQUEST_LIMIT || 100));
const AI_GLOBAL_CONCURRENCY_LIMIT = Math.max(1, Number(process.env.AI_GLOBAL_CONCURRENCY_LIMIT || 8));

const inMemoryResponseCache = new Map();
const inMemoryRateLimitBuckets = new Map();
const inMemoryDailyQuotaBuckets = new Map();
const inMemoryProviderCooldowns = new Map();
let activeAiRequests = 0;

function sanitizeSecret(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function resolveGeminiApiKey() {
  return sanitizeSecret(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');
}

function resolveOpenRouterApiKey() {
  return sanitizeSecret(process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || '');
}

function isRedisReady(redisClient) {
  return Boolean(redisClient?.isReady);
}

function getCooldownFromMemory(providerName) {
  const expiresAt = Number(inMemoryProviderCooldowns.get(providerName) || 0);
  if (!expiresAt) return 0;
  if (Date.now() >= expiresAt) {
    inMemoryProviderCooldowns.delete(providerName);
    return 0;
  }
  return expiresAt;
}

function pruneInMemoryState(now = Date.now()) {
  for (const [key, item] of inMemoryResponseCache.entries()) {
    if (Number(item?.expiresAt || 0) <= now) {
      inMemoryResponseCache.delete(key);
    }
  }

  for (const [key, bucket] of inMemoryRateLimitBuckets.entries()) {
    if (Number(bucket?.resetAt || 0) <= now) {
      inMemoryRateLimitBuckets.delete(key);
    }
  }

  for (const [key, bucket] of inMemoryDailyQuotaBuckets.entries()) {
    if (Number(bucket?.resetAt || 0) <= now) {
      inMemoryDailyQuotaBuckets.delete(key);
    }
  }

  for (const [providerName, expiresAt] of inMemoryProviderCooldowns.entries()) {
    if (Number(expiresAt || 0) <= now) {
      inMemoryProviderCooldowns.delete(providerName);
    }
  }
}

function getRateLimitFromMemory(userId) {
  pruneInMemoryState();
  const key = buildRateLimitKey(userId);
  const now = Date.now();
  const windowMs = RATE_LIMIT.windowSeconds * 1000;
  const current = inMemoryRateLimitBuckets.get(key);

  if (!current || Number(current.resetAt || 0) <= now) {
    const next = {
      count: 1,
      resetAt: now + windowMs,
    };
    inMemoryRateLimitBuckets.set(key, next);
    return {
      limited: false,
      remaining: Math.max(0, RATE_LIMIT.maxRequests - next.count),
      retryAfter: RATE_LIMIT.windowSeconds,
    };
  }

  current.count += 1;
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  const limited = current.count > RATE_LIMIT.maxRequests;

  return {
    limited,
    remaining: Math.max(0, RATE_LIMIT.maxRequests - current.count),
    retryAfter,
  };
}

function secondsUntilNextUtcDay(now = new Date()) {
  const nextDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextDay - now.getTime()) / 1000));
}

function buildDailyQuotaKey(userId, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return `ai:daily:${day}:${userId || 'anon'}`;
}

function getDailyQuotaFromMemory(userId) {
  pruneInMemoryState();
  const now = new Date();
  const key = buildDailyQuotaKey(userId, now);
  const retryAfter = secondsUntilNextUtcDay(now);
  const existing = inMemoryDailyQuotaBuckets.get(key);
  const count = Number(existing?.count || 0) + 1;
  inMemoryDailyQuotaBuckets.set(key, { count, resetAt: Date.now() + retryAfter * 1000 });
  return { limited: count > AI_DAILY_REQUEST_LIMIT, remaining: Math.max(0, AI_DAILY_REQUEST_LIMIT - count), retryAfter };
}

async function checkDailyQuota(redisClient, userId) {
  if (!isRedisReady(redisClient)) return getDailyQuotaFromMemory(userId);
  const now = new Date();
  const key = buildDailyQuotaKey(userId, now);
  const retryAfter = secondsUntilNextUtcDay(now);
  try {
    const count = await redisClient.incr(key);
    if (count === 1) await redisClient.expire(key, retryAfter);
    return { limited: count > AI_DAILY_REQUEST_LIMIT, remaining: Math.max(0, AI_DAILY_REQUEST_LIMIT - count), retryAfter };
  } catch (error) {
    aiLogger.error('Daily quota check failed', { userId, error: error.message });
    return getDailyQuotaFromMemory(userId);
  }
}

function tryAcquireAiSlot() {
  if (activeAiRequests >= AI_GLOBAL_CONCURRENCY_LIMIT) return false;
  activeAiRequests += 1;
  return true;
}

function releaseAiSlot() {
  activeAiRequests = Math.max(0, activeAiRequests - 1);
}

function getCachedResponseFromMemory(cacheKey) {
  pruneInMemoryState();
  const item = inMemoryResponseCache.get(cacheKey);
  if (!item) return null;
  if (Date.now() >= Number(item.expiresAt || 0)) {
    inMemoryResponseCache.delete(cacheKey);
    return null;
  }
  return item.payload || null;
}

function setCachedResponseInMemory(cacheKey, response, ttlSeconds = CACHE_TTL_SECONDS) {
  const ttlMs = Math.max(1, Number(ttlSeconds || CACHE_TTL_SECONDS)) * 1000;
  inMemoryResponseCache.set(cacheKey, {
    payload: response,
    expiresAt: Date.now() + ttlMs,
  });
  pruneInMemoryState();
}

function extractStatusCode(error) {
  const raw = String(error?.message || '');
  const match = raw.match(/\b([45]\d{2})\b/);
  if (!match) return 0;
  return Number(match[1]) || 0;
}

function isAuthOrQuotaError(error) {
  const statusCode = extractStatusCode(error);
  return [401, 402, 403, 429].includes(statusCode);
}

function shouldCooldownProvider(error) {
  const statusCode = extractStatusCode(error);
  if ([401, 402, 403, 429].includes(statusCode)) return true;
  return [500, 502, 503, 504].includes(statusCode);
}

function getCooldownDurationSeconds(error) {
  if (isAuthOrQuotaError(error)) return AI_PROVIDER_AUTH_COOLDOWN_SECONDS;
  return AI_PROVIDER_COOLDOWN_SECONDS;
}

function buildProviderChain(options = {}) {
  const chain = [
    { name: 'gemini', fn: callGemini, config: PROVIDERS.gemini },
    { name: 'openrouter', fn: callOpenRouter, config: PROVIDERS.openrouter },
    { name: 'ollama', fn: callOllama, config: PROVIDERS.ollama },
  ];

  const preferredOrder = Array.isArray(options.providerOrder)
    ? options.providerOrder.map((item) => String(item || '').toLowerCase())
    : null;

  if (preferredOrder && preferredOrder.length > 0) {
    chain.sort((a, b) => {
      const indexA = preferredOrder.indexOf(a.name);
      const indexB = preferredOrder.indexOf(b.name);
      const scoreA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
      const scoreB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.config.priority - b.config.priority;
    });
    return chain;
  }

  if (options.preferLocalProvider) {
    chain.sort((a, b) => {
      if (a.name === 'ollama') return -1;
      if (b.name === 'ollama') return 1;
      return a.config.priority - b.config.priority;
    });
    return chain;
  }

  chain.sort((a, b) => a.config.priority - b.config.priority);
  return chain;
}

function resolveProviderTimeoutMs(provider, options = {}, remainingBudgetMs = 0) {
  const configuredTimeout = Number(provider?.config?.timeout || 0) || 15000;
  const override = Number(options.providerTimeoutMs || 0);
  let baseTimeout = override > 0 ? Math.min(override, configuredTimeout) : configuredTimeout;

  // Do NOT abort Ollama prematurely, give it plenty of time
  if (provider?.name === 'ollama') {
    return Math.max(baseTimeout, 15000);
  }

  // Ensure minimum 1000ms timeout for all providers
  if (remainingBudgetMs > 0) {
    return Math.max(1000, Math.min(baseTimeout, remainingBudgetMs));
  }

  return baseTimeout;
}

function getMissingProviderConfigReason(providerName) {
  if (providerName === 'gemini' && !resolveGeminiApiKey()) {
    return 'gemini: API key missing or malformed';
  }
  if (providerName === 'openrouter' && !resolveOpenRouterApiKey()) {
    return 'openrouter: API key missing or malformed';
  }
  return null;
}

/**
 * Logger with structured output for observability
 */
const aiLogger = {
  info: (event, data = {}) => {
    console.log(`[AI Gateway] ${event}`, JSON.stringify({ timestamp: new Date().toISOString(), ...data }));
  },
  warn: (event, data = {}) => {
    console.warn(`[AI Gateway] ⚠️ ${event}`, JSON.stringify({ timestamp: new Date().toISOString(), ...data }));
  },
  error: (event, data = {}) => {
    console.error(`[AI Gateway] ❌ ${event}`, JSON.stringify({ timestamp: new Date().toISOString(), ...data }));
  },
  success: (event, data = {}) => {
    console.log(`[AI Gateway] ✅ ${event}`, JSON.stringify({ timestamp: new Date().toISOString(), ...data }));
  },
};

/**
 * Build cache key for AI responses
 */
function buildCacheKey(userId, problemId, actionType, codeHash) {
  return `ai:response:${userId || 'anon'}:${problemId || 'unknown'}:${actionType || 'general'}:${codeHash || 'nocode'}`;
}

/**
 * Build rate limit key for user
 */
function buildRateLimitKey(userId) {
  return `ai:ratelimit:${userId || 'anon'}`;
}

/**
 * Build cooldown key for provider
 */
function buildProviderCooldownKey(providerName) {
  return `ai:cooldown:provider:${providerName}`;
}

/**
 * Check if user is rate limited using Redis
 */
async function checkRateLimit(redisClient, userId) {
  const key = buildRateLimitKey(userId);

  if (!isRedisReady(redisClient)) {
    return getRateLimitFromMemory(userId);
  }
  
  try {
    const current = await redisClient.incr(key);
    
    if (current === 1) {
      await redisClient.expire(key, RATE_LIMIT.windowSeconds);
    }
    
    const ttl = await redisClient.ttl(key);
    
    if (current > RATE_LIMIT.maxRequests) {
      aiLogger.warn('Rate limit exceeded', { userId, current, max: RATE_LIMIT.maxRequests, ttl });
      return {
        limited: true,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : RATE_LIMIT.windowSeconds,
      };
    }
    
    return {
      limited: false,
      remaining: RATE_LIMIT.maxRequests - current,
      retryAfter: 0,
    };
  } catch (error) {
    aiLogger.error('Rate limit check failed', { userId, error: error.message });
    return getRateLimitFromMemory(userId);
  }
}

/**
 * Get cached response from Redis
 */
async function getCachedResponse(redisClient, cacheKey) {
  if (!isRedisReady(redisClient)) {
    const cached = getCachedResponseFromMemory(cacheKey);
    if (cached) {
      aiLogger.info('Cache HIT (memory)', { cacheKey: cacheKey.slice(0, 50) });
      return cached;
    }
    aiLogger.info('Cache MISS (memory)', { cacheKey: cacheKey.slice(0, 50) });
    return null;
  }

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      aiLogger.info('Cache HIT', { cacheKey: cacheKey.slice(0, 50) });
      return JSON.parse(cached);
    }
    aiLogger.info('Cache MISS', { cacheKey: cacheKey.slice(0, 50) });
    return null;
  } catch (error) {
    aiLogger.error('Cache read failed', { error: error.message });
    const cached = getCachedResponseFromMemory(cacheKey);
    if (cached) {
      aiLogger.info('Cache HIT (memory fallback)', { cacheKey: cacheKey.slice(0, 50) });
      return cached;
    }
    return null;
  }
}

/**
 * Store response in Redis cache
 */
async function setCachedResponse(redisClient, cacheKey, response, ttlSeconds = CACHE_TTL_SECONDS) {
  setCachedResponseInMemory(cacheKey, response, ttlSeconds);

  if (!isRedisReady(redisClient)) {
    return;
  }

  try {
    await redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(response));
    aiLogger.info('Cache SET', { cacheKey: cacheKey.slice(0, 50), ttl: ttlSeconds });
  } catch (error) {
    aiLogger.error('Cache write failed', { error: error.message });
  }
}

/**
 * Check if provider is in cooldown
 */
async function isProviderInCooldown(redisClient, providerName) {
  if (getCooldownFromMemory(providerName) > 0) {
    return true;
  }

  if (!isRedisReady(redisClient)) {
    return false;
  }

  try {
    const key = buildProviderCooldownKey(providerName);
    const cooldown = await redisClient.get(key);
    return cooldown !== null;
  } catch {
    return false;
  }
}

/**
 * Set provider cooldown after failure
 */
async function setProviderCooldown(redisClient, providerName, seconds = RATE_LIMIT.cooldownSeconds) {
  const durationSeconds = Math.max(1, Number(seconds || RATE_LIMIT.cooldownSeconds));
  inMemoryProviderCooldowns.set(providerName, Date.now() + (durationSeconds * 1000));

  if (!isRedisReady(redisClient)) {
    aiLogger.warn('Provider cooldown set (memory)', { provider: providerName, seconds: durationSeconds });
    return;
  }

  try {
    const key = buildProviderCooldownKey(providerName);
    await redisClient.setEx(key, durationSeconds, 'cooldown');
    aiLogger.warn('Provider cooldown set', { provider: providerName, seconds: durationSeconds });
  } catch (error) {
    aiLogger.error('Failed to set provider cooldown', { provider: providerName, error: error.message });
  }
}

/**
 * Call Gemini API
 */
async function callGemini(messages, options = {}) {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = options.model || PROVIDERS.gemini.defaultModel;
  const modelPath = encodeURIComponent(model);
  const url = `${PROVIDERS.gemini.baseUrl}/${modelPath}:generateContent`;

  // Convert OpenAI-style messages to Gemini format
  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role !== 'system');

  const geminiContents = userMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || PROVIDERS.gemini.timeout);

  try {
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        contents: geminiContents,
        generationConfig: {
          temperature: options.temperature || 0.5,
          maxOutputTokens: options.maxTokens || 500,
        },
      }),
    });

    clearTimeout(timeout);
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Empty response from Gemini');
    }

    return {
      content,
      provider: 'gemini',
      model,
      latency,
      tokensUsed: data?.usageMetadata?.totalTokenCount || 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(messages, options = {}) {
  const apiKey = resolveOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const model = options.model || process.env.AI_MODEL || PROVIDERS.openrouter.defaultModel;
  const url = process.env.AI_PROVIDER_URL || PROVIDERS.openrouter.baseUrl;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || PROVIDERS.openrouter.timeout);

  try {
    const startTime = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Robinhood DSA Platform',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature || 0.5,
        max_tokens: options.maxTokens || 500,
      }),
    });

    clearTimeout(timeout);
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenRouter');
    }

    return {
      content,
      provider: 'openrouter',
      model,
      latency,
      tokensUsed: data?.usage?.total_tokens || 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call Ollama API (local)
 */
async function callOllama(messages, options = {}) {
  const baseUrl = process.env.OLLAMA_URL || PROVIDERS.ollama.baseUrl;
  const model = options.model || process.env.OLLAMA_MODEL || PROVIDERS.ollama.defaultModel;
  const url = `${baseUrl}/api/chat`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || PROVIDERS.ollama.timeout);

  try {
    const startTime = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.5,
          num_predict: options.maxTokens || 500,
        },
      }),
    });

    clearTimeout(timeout);
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data?.message?.content;

    if (!content) {
      throw new Error('Empty response from Ollama');
    }

    return {
      content,
      provider: 'ollama',
      model,
      latency,
      tokensUsed: data?.eval_count || 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sleep helper for exponential backoff
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute request with retry and exponential backoff
 */
async function executeWithRetry(fn, providerName, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        aiLogger.warn('Retry attempt', { 
          provider: providerName, 
          attempt, 
          maxRetries, 
          backoffMs,
          error: error.message 
        });
        await sleep(backoffMs);
      }
    }
  }
  
  throw lastError;
}

/**
 * Race multiple providers in parallel for faster response
 * Returns the first successful response
 */
async function raceProviders(providers, messages, options, redisClient, fallbackReasons, deadlineAt) {
  const raceRetries = Math.max(1, Number(options.raceRetries || 1));
  const attempts = providers.map(async (provider) => {
    if (await isProviderInCooldown(redisClient, provider.name)) {
      const reason = `${provider.name}: in cooldown`;
      fallbackReasons.push(reason);
      throw new Error(reason);
    }

    const missingConfigReason = getMissingProviderConfigReason(provider.name);
    if (missingConfigReason) {
      fallbackReasons.push(missingConfigReason);
      throw new Error(missingConfigReason);
    }

    const remainingBudgetMs = deadlineAt > 0 ? Math.max(0, deadlineAt - Date.now()) : 0;
    if (deadlineAt > 0 && remainingBudgetMs <= 0) {
      const budgetReason = 'Global AI latency budget exceeded before provider race attempt.';
      fallbackReasons.push(budgetReason);
      throw new Error(budgetReason);
    }

    try {
      const timeoutMs = resolveProviderTimeoutMs(provider, options, remainingBudgetMs);
      return await executeWithRetry(
        () => provider.fn(messages, {
          ...options,
          timeout: timeoutMs,
        }),
        provider.name,
        raceRetries
      );
    } catch (error) {
      const reason = `${provider.name}: ${error.message}`;
      fallbackReasons.push(reason);
      if (shouldCooldownProvider(error)) {
        await setProviderCooldown(redisClient, provider.name, getCooldownDurationSeconds(error));
      }
      throw error;
    }
  });

  const raceTimeoutMs = deadlineAt > 0
    ? Math.max(1, deadlineAt - Date.now())
    : Math.max(1000, Number(options.raceTimeoutMs || 25000));

  let raceTimer = null;
  const timeoutPromise = new Promise((_, reject) => {
    raceTimer = setTimeout(() => {
      reject(new Error(`Race timeout after ${raceTimeoutMs}ms`));
    }, raceTimeoutMs);
  });

  try {
    return await Promise.race([
      Promise.any(attempts),
      timeoutPromise,
    ]);
  } finally {
    if (raceTimer) {
      clearTimeout(raceTimer);
    }
  }
}

/**
 * Main orchestration function - routes through providers with fallback
 * @param {Object} options.strategy - 'sequential' (default) or 'race' for parallel racing
 */
async function orchestrateAIRequestInternal(redisClient, {
  messages,
  userId,
  problemId,
  actionType,
  codeSnippet,
  options = {},
}) {
  const startTime = Date.now();
  // Force sequential strategy and ignore options.strategy
  const strategy = 'sequential'; 
  // Enforce 12000ms global budget for fast responses
  const maxTotalLatencyMs = Number(options.maxTotalLatencyMs || AI_DEFAULT_MAX_LATENCY_MS || 12000);
  const deadlineAt = maxTotalLatencyMs > 0 ? startTime + maxTotalLatencyMs : 0;
  const codeHash = codeSnippet 
    ? createHash('sha1').update(codeSnippet.trim()).digest('hex').slice(0, 12)
    : 'nocode';

  // Check rate limit
  const rateLimit = await checkRateLimit(redisClient, userId);
  if (rateLimit.limited) {
    return {
      success: false,
      errorType: 'RATE_LIMIT',
      reason: 'Too many AI requests. Please wait before trying again.',
      retryAfter: rateLimit.retryAfter,
    };
  }

  const dailyQuota = await checkDailyQuota(redisClient, userId);
  if (dailyQuota.limited) {
    return {
      success: false,
      errorType: 'DAILY_QUOTA',
      reason: 'Daily AI request quota reached. Please try again tomorrow.',
      retryAfter: dailyQuota.retryAfter,
    };
  }

  // Check cache
  const cacheKey = buildCacheKey(userId, problemId, actionType, codeHash);
  const cached = await getCachedResponse(redisClient, cacheKey);
  if (cached) {
    return {
      success: true,
      ...cached,
      fromCache: true,
      latency: Date.now() - startTime,
      totalLatency: Date.now() - startTime,
    };
  }

  const providerChain = buildProviderChain(options);

  const fallbackReasons = [];
  let lastError = null;

  if (strategy === 'race') {
    try {
      const result = await raceProviders(
        providerChain,
        messages,
        options,
        redisClient,
        fallbackReasons,
        deadlineAt
      );

      const response = {
        content: result.content,
        provider: result.provider,
        model: result.model,
        latency: result.latency,
        tokensUsed: result.tokensUsed,
        fallbackReasons: fallbackReasons.length > 0 ? fallbackReasons : undefined,
      };

      await setCachedResponse(
        redisClient,
        cacheKey,
        response,
        Number(options.cacheTtlSeconds || CACHE_TTL_SECONDS)
      );

      aiLogger.success('Request completed', {
        provider: result.provider,
        model: result.model,
        latency: result.latency,
        tokensUsed: result.tokensUsed,
        strategy,
        hadFallbacks: fallbackReasons.length > 0,
      });

      return {
        success: true,
        ...response,
        fromCache: false,
        totalLatency: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;
      fallbackReasons.push(`race: ${error?.message || 'unknown error'}`);
      aiLogger.warn('Race strategy failed, no provider succeeded', {
        reason: error?.message || 'unknown race failure',
      });
    }
  }

  for (const provider of providerChain) {
    // If we're out of budget but Ollama is next, let Ollama run. Otherwise skip.
    if (provider.name !== 'ollama' && deadlineAt > 0 && Date.now() >= deadlineAt) {
      fallbackReasons.push(`global budget exceeded (${maxTotalLatencyMs}ms)`);
      continue;
    }

    // Skip if provider is in cooldown
    if (await isProviderInCooldown(redisClient, provider.name)) {
      aiLogger.info('Provider in cooldown, skipping', { provider: provider.name });
      fallbackReasons.push(`${provider.name}: in cooldown`);
      continue;
    }

    const missingConfigReason = getMissingProviderConfigReason(provider.name);
    if (missingConfigReason) {
      fallbackReasons.push(missingConfigReason);
      continue;
    }

    try {
      aiLogger.info('Attempting provider', { provider: provider.name });

      const remainingBudgetMs = deadlineAt > 0 ? Math.max(0, deadlineAt - Date.now()) : 0;
      const timeoutMs = resolveProviderTimeoutMs(provider, options, remainingBudgetMs);
      const retries = Math.max(1, Number(options.retries || provider.config.retries || 1));

      const result = await executeWithRetry(
        () => provider.fn(messages, {
          ...options,
          timeout: timeoutMs,
        }),
        provider.name,
        retries
      );

      // Success - cache and return
      const response = {
        content: result.content,
        provider: result.provider,
        model: result.model,
        latency: result.latency,
        tokensUsed: result.tokensUsed,
        fallbackReasons: fallbackReasons.length > 0 ? fallbackReasons : undefined,
      };

      await setCachedResponse(
        redisClient,
        cacheKey,
        response,
        Number(options.cacheTtlSeconds || CACHE_TTL_SECONDS)
      );

      aiLogger.success('Request completed', {
        provider: result.provider,
        latency: result.latency,
        fallbackCount: fallbackReasons.length,
        fallbackReasons: fallbackReasons.length > 0 ? fallbackReasons : undefined,
        model: result.model,
        tokensUsed: result.tokensUsed,
        strategy,
      });

      return {
        success: true,
        ...response,
        fromCache: false,
        totalLatency: Date.now() - startTime,
      };

    } catch (error) {
      lastError = error;
      const reason = `${provider.name}: ${error.message}`;
      fallbackReasons.push(reason);
      
      aiLogger.warn('Provider failed, falling back', {
        provider: provider.name,
        error: error.message,
      });

      if (shouldCooldownProvider(error)) {
        await setProviderCooldown(redisClient, provider.name, getCooldownDurationSeconds(error));
      }
    }
  }

  // All providers failed
  const timeBudgetExceeded = deadlineAt > 0 && Date.now() >= deadlineAt;
  aiLogger.error('All providers failed', {
    fallbackReasons,
    strategy,
    timeBudgetExceeded,
  });

  return {
    success: false,
    errorType: timeBudgetExceeded ? 'TIME_BUDGET_EXCEEDED' : 'ALL_PROVIDERS_FAILED',
    reason: timeBudgetExceeded
      ? `AI response exceeded latency budget of ${maxTotalLatencyMs}ms.`
      : 'All AI providers are currently unavailable.',
    fallbackReasons,
    lastError: lastError?.message,
    totalLatency: Date.now() - startTime,
  };
}

/**
 * Health check for AI gateway
 */
export async function checkAIHealth(redisClient) {
  const health = {
    gateway: 'healthy',
    providers: {},
    redis: 'unknown',
    defaultProviderOrder: buildProviderChain({}).map((provider) => provider.name),
  };

  // Check Redis
  if (!redisClient) {
    health.redis = 'unavailable';
  } else {
    try {
      await redisClient.ping();
      health.redis = 'healthy';
    } catch {
      health.redis = 'unhealthy';
    }
  }

  health.providers.gemini = {
    configured: Boolean(resolveGeminiApiKey()),
    model: PROVIDERS.gemini.defaultModel,
    inCooldown: await isProviderInCooldown(redisClient, 'gemini'),
  };
  health.providers.openrouter = {
    configured: Boolean(resolveOpenRouterApiKey()),
    model: process.env.AI_MODEL || PROVIDERS.openrouter.defaultModel,
    inCooldown: await isProviderInCooldown(redisClient, 'openrouter'),
  };
  health.providers.ollama = {
    configured: true,
    baseUrl: process.env.OLLAMA_URL || PROVIDERS.ollama.baseUrl,
    model: process.env.OLLAMA_MODEL || PROVIDERS.ollama.defaultModel,
    inCooldown: await isProviderInCooldown(redisClient, 'ollama'),
  };

  return health;
}

export async function orchestrateAIRequest(redisClient, input) {
  if (!tryAcquireAiSlot()) {
    return {
      success: false,
      errorType: 'AI_BUSY',
      reason: 'AI capacity is temporarily full. Please retry shortly.',
      retryAfter: 2,
    };
  }
  try {
    return await orchestrateAIRequestInternal(redisClient, input);
  } finally {
    releaseAiSlot();
  }
}

// ============================================================
// STREAMING SUPPORT
// ============================================================

/**
 * Stream response from Gemini API
 */
async function* streamGemini(messages, options = {}) {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = options.model || PROVIDERS.gemini.defaultModel;
  const modelPath = encodeURIComponent(model);
  const url = `${PROVIDERS.gemini.baseUrl}/${modelPath}:streamGenerateContent?alt=sse`;

  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role !== 'system');

  const geminiContents = userMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 60000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        contents: geminiContents,
        generationConfig: {
          temperature: options.temperature || 0.5,
          maxOutputTokens: options.maxTokens || 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini streaming error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const data = JSON.parse(jsonStr);
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield { type: 'chunk', content: text, provider: 'gemini' };
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    }

    yield { type: 'done', provider: 'gemini' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Stream response from OpenRouter API
 */
async function* streamOpenRouter(messages, options = {}) {
  const apiKey = resolveOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const model = options.model || process.env.AI_MODEL || PROVIDERS.openrouter.defaultModel;
  const url = process.env.AI_PROVIDER_URL || PROVIDERS.openrouter.baseUrl;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 60000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Robinhood DSA Platform',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature || 0.5,
        max_tokens: options.maxTokens || 1000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter streaming error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            yield { type: 'done', provider: 'openrouter' };
            return;
          }
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              const text = data?.choices?.[0]?.delta?.content;
              if (text) {
                yield { type: 'chunk', content: text, provider: 'openrouter' };
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    }

    yield { type: 'done', provider: 'openrouter' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Stream response from Ollama API
 */
async function* streamOllama(messages, options = {}) {
  const baseUrl = process.env.OLLAMA_URL || PROVIDERS.ollama.baseUrl;
  const model = options.model || process.env.OLLAMA_MODEL || PROVIDERS.ollama.defaultModel;
  const url = `${baseUrl}/api/chat`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 90000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature || 0.5,
          num_predict: options.maxTokens || 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama streaming error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield { type: 'chunk', content: data.message.content, provider: 'ollama' };
            }
            if (data.done) {
              yield { type: 'done', provider: 'ollama' };
              return;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    yield { type: 'done', provider: 'ollama' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Orchestrate streaming AI request with provider fallback
 * Returns an async generator that yields chunks
 */
async function* orchestrateStreamingRequestInternal(redisClient, {
  messages,
  userId,
  problemId,
  actionType,
  options = {},
}) {
  const startTime = Date.now();

  // Check rate limit
  const rateLimit = await checkRateLimit(redisClient, userId);
  if (rateLimit.limited) {
    yield {
      type: 'error',
      errorType: 'RATE_LIMIT',
      reason: 'Too many AI requests. Please wait before trying again.',
      retryAfter: rateLimit.retryAfter,
    };
    return;
  }

  const dailyQuota = await checkDailyQuota(redisClient, userId);
  if (dailyQuota.limited) {
    yield {
      type: 'error',
      errorType: 'DAILY_QUOTA',
      reason: 'Daily AI request quota reached. Please try again tomorrow.',
      retryAfter: dailyQuota.retryAfter,
    };
    return;
  }

  const orderedProviders = buildProviderChain(options);
  const streamingProviderMap = {
    gemini: streamGemini,
    openrouter: streamOpenRouter,
    ollama: streamOllama,
  };

  const streamingProviders = orderedProviders
    .map((provider) => ({ name: provider.name, fn: streamingProviderMap[provider.name] }))
    .filter((provider) => typeof provider.fn === 'function');

  const fallbackReasons = [];

  for (const provider of streamingProviders) {
    const missingConfigReason = getMissingProviderConfigReason(provider.name);
    if (missingConfigReason) {
      fallbackReasons.push(missingConfigReason);
      continue;
    }

    if (await isProviderInCooldown(redisClient, provider.name)) {
      fallbackReasons.push(`${provider.name}: in cooldown`);
      continue;
    }

    try {
      aiLogger.info('Attempting streaming provider', { provider: provider.name });

      yield { type: 'start', provider: provider.name };

      for await (const chunk of provider.fn(messages, options)) {
        yield chunk;
      }

      aiLogger.success('Streaming completed', {
        provider: provider.name,
        latency: Date.now() - startTime,
      });

      return; // Success - exit

    } catch (error) {
      fallbackReasons.push(`${provider.name}: ${error.message}`);
      aiLogger.warn('Streaming provider failed', {
        provider: provider.name,
        error: error.message,
      });

      if (shouldCooldownProvider(error)) {
        await setProviderCooldown(redisClient, provider.name, getCooldownDurationSeconds(error));
      }

      // Try next provider
    }
  }

  // All providers failed
  yield {
    type: 'error',
    errorType: 'ALL_PROVIDERS_FAILED',
    reason: 'All AI providers are currently unavailable.',
    fallbackReasons,
  };
}

export async function* orchestrateStreamingRequest(redisClient, input) {
  if (!tryAcquireAiSlot()) {
    yield {
      type: 'error',
      errorType: 'AI_BUSY',
      reason: 'AI capacity is temporarily full. Please retry shortly.',
      retryAfter: 2,
    };
    return;
  }
  try {
    yield* orchestrateStreamingRequestInternal(redisClient, input);
  } finally {
    releaseAiSlot();
  }
}

/**
 * Express middleware for SSE streaming endpoint
 */
export function createStreamingHandler(redisClient) {
  return async (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    const { messages, userId, problemId, actionType, options } = req.body;

    try {
      const stream = orchestrateStreamingRequest(redisClient, {
        messages,
        userId,
        problemId,
        actionType,
        options,
      });

      for await (const event of stream) {
        if (res.writableEnded) break;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      aiLogger.error('Streaming handler error', { error: error.message });
      res.write(`data: ${JSON.stringify({ type: 'error', reason: error.message })}\n\n`);
      res.end();
    }
  };
}

export { aiLogger, PROVIDERS, RATE_LIMIT, CACHE_TTL_SECONDS };
