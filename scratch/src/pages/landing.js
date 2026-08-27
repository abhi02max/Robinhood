import { SUBJECT_ICONS } from '../components/brand.js';
import { BRAND_ASSETS } from '../config/assets.js';
import store from '../store.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';

// ROBINHOOD — Landing Page v4 (Premium hero with AI showcase)
export function renderLanding() {
  const user = store.get('user');
  const isLoggedIn = !!user;
  const globalSnapshot = isLoggedIn ? store.getGlobalProgressSnapshot() : null;
  const personalized = isLoggedIn ? store.getPersonalizedRecommendations() : null;
  const nextMove = personalized?.recommendations?.[0] || null;
  
  return `
  <div class="landing-page">
    <!-- Navigation -->
    <nav class="landing-nav">
      <div class="landing-nav-brand">
        ${BRAND_ASSETS.logo.lockup({ iconSize: 28, textSize: 'md', showTagline: true })}
      </div>
      <div class="landing-nav-links">
        <a href="#features" class="landing-nav-link">Features</a>
        <a href="#learn" class="landing-nav-link">Learn</a>
        <a href="#ai-mentor" class="landing-nav-link">AI Mentor</a>
      </div>
      <div class="landing-nav-actions">
        ${isLoggedIn 
          ? `<button class="btn btn-primary btn-sm" onclick="navigateTo('/dashboard')">Open Dashboard</button>`
          : `<button class="btn btn-ghost btn-sm" onclick="navigateTo('/auth?mode=login')">Log In</button>
             <button class="btn btn-primary btn-sm" onclick="navigateTo('/auth?mode=signup')">Get Started Free</button>`
        }
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="landing-hero">
      <div class="landing-hero-bg">
        <div class="landing-hero-gradient"></div>
        <div class="landing-hero-grid"></div>
      </div>
      
      <div class="landing-hero-content anim-fade-up">
        <div class="landing-hero-badge">
          <span class="badge badge-accent">🚀 Free Forever · No Credit Card</span>
        </div>
        
        <h1 class="landing-hero-title">
          Master Algorithms.<br/>
          <span class="gradient-text">Crack Any Interview.</span>
        </h1>
        
        <p class="landing-hero-sub">
          One unified platform for learning concepts, solving problems, mastering SQL and sheets,
          practicing interviews, and improving with debugger insights. Built for focused interview outcomes.
        </p>

        ${isLoggedIn && globalSnapshot ? `
          <div class="landing-user-progress">
            <div class="landing-user-progress-grid">
              <div class="landing-user-progress-item">
                <span>Problems</span>
                <strong>${globalSnapshot.solved}/${globalSnapshot.totalProblems}</strong>
                <div class="progress-bar"><div class="progress-fill-success" style="width:${globalSnapshot.solvedPct}%;"></div></div>
              </div>
              <div class="landing-user-progress-item">
                <span>Streak</span>
                <strong>${globalSnapshot.streak} days</strong>
                <div class="progress-bar"><div class="progress-fill-warning" style="width:${Math.min(100, globalSnapshot.streak * 4)}%;"></div></div>
              </div>
              <div class="landing-user-progress-item">
                <span>Mastery</span>
                <strong>${globalSnapshot.masteryPct}%</strong>
                <div class="progress-bar"><div class="progress-fill" style="width:${globalSnapshot.masteryPct}%;"></div></div>
              </div>
              <div class="landing-user-progress-item">
                <span>Readiness</span>
                <strong>${globalSnapshot.readiness}%</strong>
                <div class="progress-bar"><div class="progress-fill-danger" style="width:${globalSnapshot.readiness}%;"></div></div>
              </div>
            </div>
            ${nextMove ? `<button class="btn btn-secondary btn-sm" onclick="navigateTo('${nextMove.route}')"><i data-lucide="arrow-right" width="14" height="14"></i> ${nextMove.title}</button>` : ''}
          </div>
        ` : ''}
        
        <div class="landing-hero-actions">
          <button class="btn btn-accent btn-lg landing-cta-primary" onclick="navigateTo('${isLoggedIn ? '/dashboard' : '/auth?mode=signup'}')">
            <i data-lucide="rocket" width="18" height="18"></i>
            ${isLoggedIn ? 'Continue Learning' : 'Start Learning Free'}
          </button>
          <button class="btn btn-secondary btn-lg" onclick="document.getElementById('features').scrollIntoView({behavior:'smooth'})">
            <i data-lucide="play-circle" width="18" height="18"></i>
            See How It Works
          </button>
        </div>

        <!-- Social proof -->
        <div class="landing-social-proof">
          <div class="landing-avatars">
            ${['#6366F1','#22C55E','#F59E0B','#EF4444','#0EA5E9','#8B5CF6'].map((c,i) => 
              `<div class="landing-avatar" style="background:${c};">${['A','G','M','S','N','J'][i]}</div>`
            ).join('')}
          </div>
          <span class="landing-social-text">
            Trusted by <strong>10,000+</strong> engineers at 
            <span class="company-list">Google, Amazon, Microsoft, Meta</span>
          </span>
        </div>
      </div>
      
      <!-- Hero visual: Animated code preview -->
      <div class="landing-hero-visual anim-fade-up delay-2">
        <div class="code-preview-card">
          <div class="code-preview-header">
            <div class="code-preview-dots">
              <span></span><span></span><span></span>
            </div>
            <span class="code-preview-title">two-sum.py</span>
            <span class="badge badge-success">✓ Accepted</span>
          </div>
          <div class="code-preview-body">
            <pre><code><span class="kw">class</span> <span class="fn">Solution</span>:
    <span class="kw">def</span> <span class="fn">twoSum</span>(self, nums: List[<span class="type">int</span>], target: <span class="type">int</span>) -> List[<span class="type">int</span>]:
        <span class="cm"># Use a hash map for O(n) lookup</span>
        seen = {}
        <span class="kw">for</span> i, num <span class="kw">in</span> enumerate(nums):
            complement = target - num
            <span class="kw">if</span> complement <span class="kw">in</span> seen:
                <span class="kw">return</span> [seen[complement], i]
            seen[num] = i
        <span class="kw">return</span> []</code></pre>
          </div>
          <div class="code-preview-ai">
            <div class="ai-badge">
              <i data-lucide="sparkles" width="14" height="14"></i>
              <span>Robin AI</span>
            </div>
            <p class="ai-message">Great solution! Using a hash map gives O(n) time. Consider the edge case where the same index could be used twice.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Banner -->
    <section class="landing-stats-banner">
      <div class="landing-stats">
        <div class="landing-stat">
          <div class="landing-stat-value">465<span class="stat-plus">+</span></div>
          <div class="landing-stat-label">Curated Problems</div>
        </div>
        <div class="landing-stat">
          <div class="landing-stat-value">86</div>
          <div class="landing-stat-label">Companies</div>
        </div>
        <div class="landing-stat">
          <div class="landing-stat-value">26</div>
          <div class="landing-stat-label">Topic Categories</div>
        </div>
        <div class="landing-stat">
          <div class="landing-stat-value">5</div>
          <div class="landing-stat-label">CS Fundamentals</div>
        </div>
      </div>
    </section>

    <section class="landing-unified-flow" id="unified-flow">
      <div class="landing-section-header">
        <span class="landing-section-eyebrow">Unified Flow</span>
        <h2 class="landing-section-title">One journey from learning to interview confidence.</h2>
        <p class="landing-section-sub">Start with concept clarity, move into coding practice, reinforce with sheets and SQL, then simulate interviews with measurable readiness.</p>
      </div>
      <div class="landing-flow-track">
        <article class="landing-flow-step">
          <span class="step-index">1</span>
          <h4>Learn</h4>
          <p>Build fundamentals and concept mastery.</p>
        </article>
        <article class="landing-flow-step">
          <span class="step-index">2</span>
          <h4>Problems</h4>
          <p>Practice core patterns with feedback.</p>
        </article>
        <article class="landing-flow-step">
          <span class="step-index">3</span>
          <h4>Sheets + SQL</h4>
          <p>Boost coverage and applied query skills.</p>
        </article>
        <article class="landing-flow-step">
          <span class="step-index">4</span>
          <h4>Interview</h4>
          <p>Simulate rounds and track progression.</p>
        </article>
        <article class="landing-flow-step">
          <span class="step-index">5</span>
          <h4>Improve</h4>
          <p>Use debugger insights to close gaps fast.</p>
        </article>
      </div>
    </section>

    <!-- Features Section -->
    <section class="landing-features" id="features">
      <div class="landing-section-header">
        <span class="landing-section-eyebrow">Features</span>
        <h2 class="landing-section-title">Everything you need to<br/><span class="gradient-text">prepare smarter.</span></h2>
        <p class="landing-section-sub">Built by engineers who've cracked FAANG interviews. Every feature exists to accelerate your success.</p>
      </div>
      
      <div class="landing-bento">
        <!-- Main feature: Code Editor -->
        <div class="feature-card feature-wide feature-editor anim-fade-up">
          <div class="feature-visual">
            <div class="editor-mockup">
              <div class="editor-sidebar">
                <div class="editor-file active">two-sum.py</div>
                <div class="editor-file">valid-parentheses.js</div>
                <div class="editor-file">merge-intervals.cpp</div>
              </div>
              <div class="editor-main">
                <div class="editor-lines">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                </div>
                <div class="editor-code">
                  <code><span class="kw">def</span> <span class="fn">twoSum</span>(nums, target):</code>
                </div>
              </div>
            </div>
          </div>
          <div class="feature-content">
            <div class="feature-icon" style="background:var(--gradient-hero)">
              <i data-lucide="code-2" width="20" height="20"></i>
            </div>
            <div class="feature-title">VS Code-Powered Editor</div>
            <div class="feature-desc">Monaco Editor with syntax highlighting, intellisense, and multi-language support. C++, Java, Python, JavaScript, and C# — all in your browser.</div>
          </div>
        </div>
        
        <!-- AI Mentor -->
        <div class="feature-card feature-ai anim-fade-up delay-1">
          <div class="feature-icon" style="background:linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)">
            <i data-lucide="sparkles" width="20" height="20"></i>
          </div>
          <div class="feature-title">AI-Powered Mentor</div>
          <div class="feature-desc">Robin explains concepts, gives hints without spoilers, reviews your code, and suggests optimizations. Like having a senior engineer by your side.</div>
          <div class="feature-preview">
            <div class="ai-chat-bubble">
              <strong>Robin:</strong> Try using a hash map for O(1) lookup. What data structure have you considered?
            </div>
          </div>
        </div>
        
        <!-- Companies -->
        <div class="feature-card anim-fade-up delay-2">
          <div class="feature-icon" style="background:#6366F1">
            <i data-lucide="building-2" width="20" height="20"></i>
          </div>
          <div class="feature-title">Company-Specific Prep</div>
          <div class="feature-desc">86+ companies with interview patterns, round structures, and most-asked problems. Know exactly what Google, Amazon, and Stripe ask.</div>
          <div class="company-logos">
            <span class="company-logo">G</span>
            <span class="company-logo">A</span>
            <span class="company-logo">M</span>
            <span class="company-logo">+83</span>
          </div>
        </div>
        
        <!-- Streak System -->
        <div class="feature-card anim-fade-up delay-2">
          <div class="feature-icon" style="background:#22C55E">
            <i data-lucide="flame" width="20" height="20"></i>
          </div>
          <div class="feature-title">Streak & XP System</div>
          <div class="feature-desc">Build consistency with daily streaks, earn XP for every problem, and level up from Novice to Grandmaster across 50 levels.</div>
          <div class="streak-preview">
            <span class="streak-badge">🔥 42 day streak</span>
            <span class="xp-badge">Level 23</span>
          </div>
        </div>
        
        <!-- Roadmap -->
        <div class="feature-card anim-fade-up delay-3">
          <div class="feature-icon" style="background:var(--gradient-warm)">
            <i data-lucide="map" width="20" height="20"></i>
          </div>
          <div class="feature-title">Structured Roadmap</div>
          <div class="feature-desc">From arrays to advanced DP — a structured path so you always know what to learn next. No more confusion about where to start.</div>
        </div>
        
        <!-- Analytics -->
        <div class="feature-card anim-fade-up delay-3">
          <div class="feature-icon" style="background:#EF4444">
            <i data-lucide="bar-chart-3" width="20" height="20"></i>
          </div>
          <div class="feature-title">Progress Analytics</div>
          <div class="feature-desc">Contribution heatmap, difficulty breakdown charts, interview readiness score, and weekly performance tracking.</div>
        </div>
      </div>
    </section>

    <!-- CS Fundamentals Section -->
    <section class="landing-learn" id="learn">
      <div class="landing-section-header">
        <span class="landing-section-eyebrow">CS Fundamentals</span>
        <h2 class="landing-section-title">Master the theory.<br/><span class="gradient-text">Not just coding.</span></h2>
        <p class="landing-section-sub">Deep-dive modules on Operating Systems, Networks, Databases, OOP, and System Design. Interview-focused, beautifully presented.</p>
      </div>
      
      <div class="subject-grid">
        <div class="subject-card anim-fade-up" onclick="navigateTo('/learn/os')">
          <div class="subject-icon">${SUBJECT_ICONS.os.icon(32)}</div>
          <h3>Operating Systems</h3>
          <p>Processes, threads, memory management, file systems, and scheduling algorithms.</p>
          <span class="subject-topics">35 topics</span>
        </div>
        <div class="subject-card anim-fade-up delay-1" onclick="navigateTo('/learn/cn')">
          <div class="subject-icon">${SUBJECT_ICONS.cn.icon(32)}</div>
          <h3>Computer Networks</h3>
          <p>OSI model, TCP/IP, HTTP, DNS, and how the internet actually works.</p>
          <span class="subject-topics">28 topics</span>
        </div>
        <div class="subject-card anim-fade-up delay-2" onclick="navigateTo('/learn/dbms')">
          <div class="subject-icon">${SUBJECT_ICONS.dbms.icon(32)}</div>
          <h3>Database Systems</h3>
          <p>SQL, normalization, indexing, transactions, and database design.</p>
          <span class="subject-topics">32 topics</span>
        </div>
        <div class="subject-card anim-fade-up delay-3" onclick="navigateTo('/learn/oops')">
          <div class="subject-icon">${SUBJECT_ICONS.oops.icon(32)}</div>
          <h3>OOP Concepts</h3>
          <p>Encapsulation, inheritance, polymorphism, design patterns, and SOLID principles.</p>
          <span class="subject-topics">24 topics</span>
        </div>
        <div class="subject-card anim-fade-up delay-4" onclick="navigateTo('/learn/system-design')">
          <div class="subject-icon">${SUBJECT_ICONS.sd.icon(32)}</div>
          <h3>System Design</h3>
          <p>Scalability, load balancing, caching, databases, and designing real systems.</p>
          <span class="subject-topics">40 topics</span>
        </div>
      </div>
    </section>

    <!-- AI Mentor Showcase -->
    <section class="landing-ai-showcase" id="ai-mentor">
      <div class="landing-section-header">
        <span class="landing-section-eyebrow">Meet Robin</span>
        <h2 class="landing-section-title">Your AI-powered<br/><span class="gradient-text">coding mentor.</span></h2>
        <p class="landing-section-sub">Robin doesn't just give answers — it teaches you to think like a top engineer.</p>
      </div>
      
      <div class="ai-demo-container">
        <div class="ai-demo-card anim-fade-up">
          <div class="ai-demo-header">
            <div class="ai-demo-avatar">
              <i data-lucide="sparkles" width="20" height="20"></i>
            </div>
            <div class="ai-demo-title">
              <strong>Robin AI Mentor</strong>
              <span>Your personal DSA coach</span>
            </div>
          </div>
          
          <div class="ai-demo-features">
            <div class="ai-feature">
              <div class="ai-feature-icon"><i data-lucide="lightbulb" width="18" height="18"></i></div>
              <div class="ai-feature-content">
                <strong>Explain Concepts</strong>
                <span>Get clear explanations of any DSA concept with examples and analogies.</span>
              </div>
            </div>
            <div class="ai-feature">
              <div class="ai-feature-icon"><i data-lucide="help-circle" width="18" height="18"></i></div>
              <div class="ai-feature-content">
                <strong>Smart Hints</strong>
                <span>Stuck? Get progressive hints that guide you without spoiling the solution.</span>
              </div>
            </div>
            <div class="ai-feature">
              <div class="ai-feature-icon"><i data-lucide="code" width="18" height="18"></i></div>
              <div class="ai-feature-content">
                <strong>Code Review</strong>
                <span>Submit your code for feedback on style, efficiency, and edge cases.</span>
              </div>
            </div>
            <div class="ai-feature">
              <div class="ai-feature-icon"><i data-lucide="zap" width="18" height="18"></i></div>
              <div class="ai-feature-content">
                <strong>Optimization Tips</strong>
                <span>Learn how to improve time and space complexity with targeted suggestions.</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="ai-demo-chat anim-fade-up delay-1">
          <div class="chat-message user">
            <span>I'm stuck on Two Sum. I can do O(n²) but need O(n).</span>
          </div>
          <div class="chat-message assistant">
            <div class="chat-avatar"><i data-lucide="sparkles" width="14" height="14"></i></div>
            <span>Great that you recognize the brute force approach! 💡 Here's a hint: think about what data structure gives you O(1) lookup. As you iterate through the array, what would you need to find quickly?</span>
          </div>
          <div class="chat-message user">
            <span>A hash map! I can store numbers I've seen and check for the complement.</span>
          </div>
          <div class="chat-message assistant">
            <div class="chat-avatar"><i data-lucide="sparkles" width="14" height="14"></i></div>
            <span>Exactly! 🎯 You got it. Store each number with its index, then for each element check if (target - num) exists in your map. That's the optimal O(n) solution!</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="landing-cta-section">
      <div class="cta-content anim-fade-up">
        <h2>Ready to crack your<br/><span class="gradient-text">dream interview?</span></h2>
        <p>Join thousands of engineers who've landed jobs at top companies.</p>
        <button class="btn btn-accent btn-lg landing-cta-primary" onclick="navigateTo('${isLoggedIn ? '/dashboard' : '/auth?mode=signup'}')">
          <i data-lucide="rocket" width="18" height="18"></i>
          ${isLoggedIn ? 'Go to Dashboard' : 'Get Started — It\'s Free'}
        </button>
        <span class="cta-note">No credit card required · Free forever</span>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-content">
        <div class="footer-brand">
          ${BRAND_ASSETS.logo.lockup({ iconSize: 24, textSize: 'sm', showTagline: true })}
          <p>The free, beautiful way to master algorithms.</p>
        </div>
        <div class="footer-links">
          <div class="footer-column">
            <h4>Platform</h4>
            <a href="#" onclick="navigateTo('/problems'); return false;">Problems</a>
            <a href="#" onclick="navigateTo('/companies'); return false;">Companies</a>
            <a href="#" onclick="navigateTo('/roadmap'); return false;">Roadmap</a>
          </div>
          <div class="footer-column">
            <h4>Learn</h4>
            <a href="#" onclick="navigateTo('/learn/os'); return false;">Operating Systems</a>
            <a href="#" onclick="navigateTo('/learn/cn'); return false;">Networks</a>
            <a href="#" onclick="navigateTo('/learn/dbms'); return false;">DBMS</a>
          </div>
          <div class="footer-column">
            <h4>Resources</h4>
            <a href="#" onclick="navigateTo('/concept-map'); return false;">Concept Map</a>
            <a href="#" onclick="navigateTo('/revision'); return false;">Revision</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} The Robinhood for Good. Built with ❤️ for engineers.</p>
      </div>
    </footer>

    ${renderAskRobinFab()}
    ${renderAskRobinPanel()}
  </div>
  `;
}

export function initLanding() {
  setRobinContext(
    'Platform Onboarding',
    'Getting Started',
    'Guide me with a clear day-1 to day-7 plan for DSA + CS fundamentals interview prep.'
  );
  initAskRobin();
}
