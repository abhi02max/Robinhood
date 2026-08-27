// ROBINHOOD — Concept Map v2 (DB-driven via /api/learning/problems-index)
//
// Migration note (Apr 2026):
// Previously did a dynamic `import('../data/problems.js')` to compute
// per-category mastery from the static array. The dynamic-import
// dependency is gone — mastery is now computed from
// /api/learning/problems-index, grouped by topic.slug (the DB equivalent
// of the legacy `category` field).
import store from '../store.js';
import CATEGORIES from '../data/categories.js';
import { fetchProblemsIndex, ApiError } from '../utils/learning-api.js';
import { renderAskRobinFab, renderAskRobinPanel, initAskRobin, setRobinContext } from '../components/ask-robin.js';

// Graph structure defining coordinates (in percentage 0-100) and prerequisites
const MAP_NODES = [
  { id: 'arrays', x: 5, y: 30, prereqs: [] },
  { id: 'linked-list', x: 5, y: 70, prereqs: [] },
  
  { id: 'strings', x: 20, y: 15, prereqs: ['arrays'] },
  { id: 'two-pointers', x: 20, y: 30, prereqs: ['arrays'] },
  { id: 'stack', x: 20, y: 50, prereqs: ['arrays'] },
  { id: 'binary-search', x: 20, y: 65, prereqs: ['arrays'] },
  
  { id: 'sliding-window', x: 35, y: 30, prereqs: ['two-pointers'] },
  { id: 'queue', x: 35, y: 50, prereqs: ['stack', 'linked-list'] },
  { id: 'binary-tree', x: 35, y: 70, prereqs: ['linked-list'] },
  
  { id: 'math', x: 50, y: 15, prereqs: [] },
  { id: 'sorting', x: 50, y: 30, prereqs: ['arrays'] },
  { id: 'bst', x: 50, y: 60, prereqs: ['binary-tree'] },
  { id: 'heap', x: 50, y: 80, prereqs: ['binary-tree'] },
  
  { id: 'recursion', x: 65, y: 15, prereqs: ['stack', 'binary-tree'] },
  { id: 'backtracking', x: 65, y: 30, prereqs: ['recursion'] },
  { id: 'graph-bfs-dfs', x: 65, y: 70, prereqs: ['binary-tree'] },
  { id: 'matrix', x: 65, y: 90, prereqs: ['arrays', 'graph-bfs-dfs'] },
  
  { id: 'bit-manipulation', x: 80, y: 15, prereqs: ['math'] },
  { id: 'trie', x: 80, y: 30, prereqs: ['strings', 'binary-tree'] },
  { id: 'dp-1d', x: 80, y: 50, prereqs: ['recursion', 'two-pointers'] },
  { id: 'graph-advanced', x: 80, y: 70, prereqs: ['graph-bfs-dfs'] },
  
  { id: 'dp-2d', x: 95, y: 40, prereqs: ['dp-1d', 'matrix'] },
  { id: 'dp-advanced', x: 95, y: 55, prereqs: ['dp-2d'] },
  { id: 'greedy', x: 95, y: 70, prereqs: ['sorting'] },
  { id: 'segment-tree', x: 95, y: 85, prereqs: ['binary-search'] },
  { id: 'design', x: 95, y: 20, prereqs: ['arrays', 'linked-list'] }
];

export function renderConceptMap() {
  return `
  <div class="map-page">
    <div style="text-align:center;margin-bottom:var(--sp-8);" class="anim-fade-up">
      <h1 class="page-title">Concept Mastery Map</h1>
      <p class="page-subtitle">Track the dependency tree of algorithms. Master foundational nodes to unlock advanced concepts.</p>
    </div>
    
    <div class="map-container anim-fade-up delay-1" id="map-container">
      <svg class="map-svg" id="map-svg"></svg>
      <div class="map-nodes" id="map-nodes-layer"></div>
    </div>

    ${renderAskRobinFab()}
    ${renderAskRobinPanel()}
  </div>
  `;
}

export function initConceptMap() {
  setRobinContext(
    'DSA Concept Map',
    'Learning Dependencies',
    'Explain what topic I should learn next based on prerequisites and interview priority.'
  );
  initAskRobin();

  const svg = document.getElementById('map-svg');
  const nodesLayer = document.getElementById('map-nodes-layer');
  if (!svg || !nodesLayer) return;

  const nodeElements = [];
  const svgPaths = [];

  // Compute per-category mastery from /api/learning/problems-index.
  // Each row exposes `topic.slug`, which is the DB-side equivalent of the
  // legacy `category` field on the static problem array. AbortController
  // cancels the fetch on route-leave (wired in the cleanup hook below).
  const fetchController = new AbortController();
  fetchProblemsIndex({ signal: fetchController.signal }).then((problems) => {
    const catStats = {};

    problems.forEach((p) => {
      const categoryId = p?.topic?.slug;
      if (!categoryId) return;
      if (!catStats[categoryId]) catStats[categoryId] = { total: 0, solved: 0 };
      catStats[categoryId].total += 1;
      if (store.getProblemStatus(p.id) === 'solved') {
        catStats[categoryId].solved += 1;
      }
    });

    const isMastered = (catId) => {
      const st = catStats[catId];
      if (!st || st.total === 0) return true; 
      // Consider "mastered" if they solved at least 25% round up.
      const threshold = Math.max(1, Math.ceil(st.total * 0.25));
      return st.solved >= threshold;
    };

    const isUnlocked = (node) => {
      if (node.prereqs.length === 0) return true;
      // It is unlocked if at least ONE prereq is mastered, 
      // or optionally ALL prereqs. ALL is stricter and better for learning.
      return node.prereqs.every(reqId => isMastered(reqId));
    };

    // Render Nodes
    MAP_NODES.forEach((node, idx) => {
      const catData = CATEGORIES.find(c => c.id === node.id);
      if (!catData) return;

      const masterStatus = isMastered(node.id);
      const unlockStatus = isUnlocked(node);
      
      let statusClass = 'locked';
      if (masterStatus) statusClass = 'mastered';
      else if (unlockStatus) statusClass = 'unlocked';

      const st = catStats[node.id] || { total: 0, solved: 0 };
      
      const el = document.createElement('div');
      el.className = `map-node ${statusClass}`;
      el.style.left = `${node.x}%`;
      el.style.top = `${node.y}%`;
      el.style.animationDelay = `${idx * 30}ms`;
      el.dataset.id = node.id;
      
      el.innerHTML = `
        <div class="node-icon"><i data-lucide="${catData.icon}" width="18" height="18"></i></div>
        <div class="node-label">${catData.name}</div>
        <div class="node-meta">${st.solved} / ${st.total}</div>
      `;

      el.addEventListener('click', () => {
        if (unlockStatus || masterStatus) {
          window.navigateTo(`/problems?category=${node.id}`);
        } else {
          import('../components/notifications.js').then(n => {
            n.showToast(`Complete prerequisites to unlock ${catData.name}`, 'warning');
          });
        }
      });

      nodesLayer.appendChild(el);
      nodeElements.push({ ...node, el });
    });

    // Need lucide icons
    if (window.lucide) window.lucide.createIcons();

    // Draw lines after a tiny delay for layout settlement
    setTimeout(() => {
      drawLines();
    }, 50);

    // Redraw on resize
    window.addEventListener('resize', drawLines);

    // Save cleaner
    import('../router.js').then(rt => {
      const oldLeave = rt.router.onRouteLeave;
      rt.router.onRouteLeave = () => {
        window.removeEventListener('resize', drawLines);
        fetchController.abort();
        if (oldLeave) oldLeave();
      }
    });

    function drawLines() {
      svg.innerHTML = ''; // clear paths
      const containerRect = svg.getBoundingClientRect();
      
      MAP_NODES.forEach(node => {
        const toNodeData = nodeElements.find(n => n.id === node.id);
        if (!toNodeData) return;
        const toRect = toNodeData.el.getBoundingClientRect();
        const toX = toRect.left - containerRect.left + (toRect.width / 2);
        const toY = toRect.top - containerRect.top + (toRect.height / 2);

        node.prereqs.forEach(reqId => {
          const fromNodeData = nodeElements.find(n => n.id === reqId);
          if (!fromNodeData) return;

          const fromRect = fromNodeData.el.getBoundingClientRect();
          const fromX = fromRect.left - containerRect.left + (fromRect.width / 2);
          const fromY = fromRect.top - containerRect.top + (fromRect.height / 2);

          // Path generation (smooth bezier)
          const offset = Math.max(80, Math.abs(toX - fromX) / 2);
          const d = `M ${fromX} ${fromY} C ${fromX + offset} ${fromY}, ${toX - offset} ${toY}, ${toX} ${toY}`;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d);
          
          let pathClass = 'map-link';
          if (isMastered(reqId)) {
            pathClass += ' map-link-active';
          }
          
          path.setAttribute('class', pathClass);
          svg.appendChild(path);
        });
      });
    }
  }).catch((error) => {
    if (error?.name === 'AbortError') return;
    const message = error instanceof ApiError ? error.message : 'Failed to load concept-map data';
    const container = document.getElementById('map-container');
    if (container) {
      container.innerHTML = `
        <div class="experience-muted" style="padding:32px;text-align:center;">
          Couldn't load concept map — ${message}.
          <div style="margin-top:8px;">
            <button class="btn btn-secondary btn-sm" onclick="location.reload()">Reload page</button>
          </div>
        </div>`;
    }
  });
}
