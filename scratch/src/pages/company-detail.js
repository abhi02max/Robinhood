// ROBINHOOD — Company Detail Page (Layer 9: Competitive Intelligence)
import { getCompanyById } from '../data/companies.js';
import store from '../store.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';

export function renderCompanyDetail(params) {
  const company = getCompanyById(params?.id);
  if (!company) return `<div class="page-wrap"><h1 class="page-title">Company not found</h1><button class="btn btn-primary" onclick="navigateTo('/companies')">Back</button></div>`;

  return `
  <div class="company-detail-page">
    <button class="btn btn-ghost btn-sm" onclick="navigateTo('/companies')" style="margin-bottom:var(--sp-4);">
      <i data-lucide="arrow-left" width="14" height="14"></i> Back
    </button>

    <div class="company-detail-header anim-fade-up">
      <div class="company-detail-logo" style="background:${company.color || 'var(--accent)'}">${company.name.slice(0, 2).toUpperCase()}</div>
      <div style="flex:1;">
        <h1 class="company-detail-name" id="intel-target-company" data-company-name="${escapeHtml(company.name)}">${escapeHtml(company.name)}</h1>
        <div class="company-detail-meta">
          <span>${company.industry || 'Technology'}</span>
          <span>${company.tier || 'Tier 1'}</span>
          <span id="intel-total-problems">Loading...</span>
        </div>
      </div>
      <div>
        <button id="generate-prep-strategy-btn" class="btn btn-primary" style="background:var(--accent);color:var(--bg-1);">
           <i data-lucide="sparkles" width="16" height="16"></i> Generate Prep Strategy
        </button>
      </div>
    </div>

    <!-- AI Prep Generation Output -->
    <div id="ai-prep-output" style="display:none;margin:var(--sp-4) 0;padding:var(--sp-4);border:1px solid var(--accent);background:var(--accent-muted);border-radius:12px;color:var(--text-1);">
    </div>

    <div class="company-detail-grid anim-fade-up delay-1">
      <div class="chart-card">
        <div class="chart-card-title"><i data-lucide="pie-chart" width="16" height="16"></i> Database Difficulty Intel</div>
        <div id="intel-diff-container" style="margin-top:var(--sp-3);text-align:center;color:var(--text-4);">
           <i class="lucide-loader spin" width="24" height="24"></i>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-title"><i data-lucide="bar-chart-3" width="16" height="16"></i> Top Topics (Aggregated)</div>
        <div id="intel-topics-container" style="margin-top:var(--sp-3);text-align:center;color:var(--text-4);">
           Generating stats...
        </div>
      </div>
    </div>

    <!-- Problems -->
    <div class="chart-card anim-fade-up delay-3">
      <div class="chart-card-title"><i data-lucide="list" width="16" height="16"></i> Verified Problem Bank</div>
      <div id="intel-problems-container" style="margin-top:var(--sp-2);">
      </div>
    </div>
    
    ${renderAskRobinFab()}
    ${renderAskRobinPanel()}
  </div>
  `;
}

export function initCompanyDetail() {
  setRobinContext('Company Prep', 'Company Detail', 'Help me create a focused prep strategy.');
  initAskRobin();

  const titleEl = document.getElementById('intel-target-company');
  const compName = titleEl?.dataset?.companyName;
  if (!compName) return;

  // Track global stats object to pass to AI Prep Generator
  let intelStatsObj = null;

  async function fetchIntelligence() {
    try {
      const res = await fetch('/api/intel/company/' + encodeURIComponent(compName));
      const data = await res.json();

      if (!data.ok || !data.stats) {
        document.getElementById('intel-diff-container').innerHTML = 'No data available for this company.';
        document.getElementById('intel-topics-container').innerHTML = 'No data available.';
        document.getElementById('intel-problems-container').innerHTML = 'No problems linked.';
        return;
      }

      intelStatsObj = data.stats;
      const { difficulty, total, topTopics } = data.stats;
      const problems = data.problems || [];

      document.getElementById('intel-total-problems').textContent = total + ' verified problems';

      // Render Diff
      document.getElementById('intel-diff-container').innerHTML = `
        <div style="text-align:left;">
          <div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:4px;"><span style="color:var(--easy)">Easy</span><span style="color:var(--text-3)">${difficulty.Easy} (${Math.round(difficulty.Easy/total*100)||0}%)</span></div><div class="progress-bar"><div class="progress-fill-success" style="width:${difficulty.Easy/total*100}%"></div></div></div>
          <div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:4px;"><span style="color:var(--medium)">Medium</span><span style="color:var(--text-3)">${difficulty.Medium} (${Math.round(difficulty.Medium/total*100)||0}%)</span></div><div class="progress-bar"><div class="progress-fill-warning" style="width:${difficulty.Medium/total*100}%"></div></div></div>
          <div><div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:4px;"><span style="color:var(--hard)">Hard</span><span style="color:var(--text-3)">${difficulty.Hard} (${Math.round(difficulty.Hard/total*100)||0}%)</span></div><div class="progress-bar"><div class="progress-fill-danger" style="width:${difficulty.Hard/total*100}%"></div></div></div>
        </div>
      `;

      // Render Topics
      document.getElementById('intel-topics-container').innerHTML = `
        <div style="text-align:left;">
          ${topTopics.map(([topic, count]) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="font-size:var(--text-sm);min-width:120px;color:var(--text-2);text-transform:uppercase;">${topic}</span>
              <div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:${(count / topTopics[0][1]) * 100}%"></div></div>
              <span style="font-size:var(--text-xs);color:var(--text-4);min-width:20px;">${count}</span>
            </div>
          `).join('')}
        </div>
      `;

      // Render Problems
      const pCount = Math.min(problems.length, 25);
      let problemsHtml = '';
      for (let i = 0; i < pCount; i++) {
        const p = problems[i];
        const status = store.getProblemStatus(p.id);
        const diffClass = 'badge-' + (p.difficulty || 'medium').toLowerCase();
        problemsHtml += `
          <div class="problem-row" style="grid-template-columns:36px 1fr 72px 40px;" onclick="navigateTo('/problem/${p.slug || p.id}')">
            <div class="problem-num">${i+1}</div>
            <div class="problem-title-text">${escapeHtml(p.title)}</div>
            <div><span class="badge ${diffClass}">${p.difficulty}</span></div>
            <div>${status === 'solved' ? '<span style="color:var(--success);">✓</span>' : ''}</div>
          </div>
        `;
      }
      document.getElementById('intel-problems-container').innerHTML = problemsHtml;

    } catch (err) {
      document.getElementById('intel-diff-container').innerHTML = 'Error loading intel.';
      console.error(err);
    }
  }

  fetchIntelligence();

  // AI Generation Button logic
  const genBtn = document.getElementById('generate-prep-strategy-btn');
  const aiOutput = document.getElementById('ai-prep-output');

  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      if (!intelStatsObj) return;
      genBtn.disabled = true;
      genBtn.innerHTML = '<i class="lucide-loader spin" width="16" height="16"></i> Analyzing...';
      aiOutput.style.display = 'block';
      aiOutput.innerHTML = '<div style="opacity:0.7;display:flex;align-items:center;gap:8px;"><i class="lucide-brain" width="16" height="16"></i> Developing intensive strategy Socratic plan...</div>';

      try {
        const reqPayload = { companyName: compName, stats: intelStatsObj };
        const res = await fetch('/api/ai/company-prep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload)
        });
        const d = await res.json();
        
        if (!d.ok || d.report?.error) throw new Error(d.report?.error || "AI Generation Failed");

        const rep = d.report;
        aiOutput.innerHTML = `
          <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;color:var(--accent);">Intel Strategy Blueprint</h3>
          <p style="margin-bottom:16px;font-size:14px;line-height:1.5;">${escapeHtml(rep.focusBlueprint)}</p>
          
          <h4 style="font-size:12px;text-transform:uppercase;margin-bottom:8px;color:var(--danger);">Common Pitfalls</h4>
          <ul style="margin-bottom:16px;padding-left:16px;font-size:13px;line-height:1.5;">
            ${(rep.topPitfalls || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')}
          </ul>

          <h4 style="font-size:12px;text-transform:uppercase;margin-bottom:8px;color:var(--primary);">Strict 5-Day Plan</h4>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${(rep.dailyPlan || []).map(dp => `
              <div style="background:var(--bg-1);border:1px solid var(--border-2);padding:10px;border-radius:8px;">
                <div style="font-weight:700;font-size:12px;color:var(--primary);margin-bottom:4px;">Day ${dp.day}: ${escapeHtml(dp.focus)}</div>
                <div style="font-size:12px;color:var(--text-2);">${escapeHtml(dp.reasoning)}</div>
              </div>
            `).join('')}
          </div>
        `;
      } catch (err) {
        aiOutput.innerHTML = '<span style="color:var(--danger)">Failed to generate intelligence.</span>';
      } finally {
        genBtn.style.display = 'none'; // Only allow once per view
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
