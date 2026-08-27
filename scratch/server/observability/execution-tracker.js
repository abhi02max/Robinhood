function normalizeEvent(event = {}) {
  return {
    timestamp: new Date().toISOString(),
    requestId: event.requestId || null,
    endpoint: event.endpoint || 'unknown',
    language: event.language || 'unknown',
    success: Boolean(event.success),
    provider: event.provider || 'unknown',
    verdict: event.verdict || null,
    error: event.error ? String(event.error).slice(0, 600) : null,
    durationMs: Number.isFinite(Number(event.durationMs)) ? Number(event.durationMs) : null,
    statusCode: Number.isFinite(Number(event.statusCode)) ? Number(event.statusCode) : null,
  };
}

export function createExecutionTracker(options = {}) {
  const maxItems = Math.max(50, Number(options.maxItems || 800));
  const events = [];

  function record(event) {
    const normalized = normalizeEvent(event);
    events.push(normalized);
    if (events.length > maxItems) {
      events.splice(0, events.length - maxItems);
    }
    return normalized;
  }

  function listRecent(limit = 100) {
    const safeLimit = Math.max(1, Number(limit || 100));
    return events.slice(-safeLimit).reverse();
  }

  function snapshot() {
    return {
      size: events.length,
      maxItems,
      latest: events.length ? events[events.length - 1] : null,
    };
  }

  return {
    record,
    listRecent,
    snapshot,
  };
}

export default {
  createExecutionTracker,
};
