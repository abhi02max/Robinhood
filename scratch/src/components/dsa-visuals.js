// ============================================
// DSA VISUAL DIAGRAMS COMPONENT
// ============================================
// SVG-based visualizations for DSA problems
// Includes: Trees, Graphs, Linked Lists, Grids, Arrays
// ============================================

/**
 * Generate SVG for a binary tree visualization
 * @param {Array} nodes - Array representation of tree [1,2,3,null,4,5,6]
 * @param {Object} options - Visualization options
 */
export function renderBinaryTree(nodes, options = {}) {
  if (!nodes || nodes.length === 0) return '';
  
  const {
    width = 400,
    height = 250,
    nodeRadius = 18,
    highlightNodes = [],
    highlightEdges = [],
    labels = {},
    showIndices = false,
  } = options;

  // Calculate tree layout
  const levels = Math.ceil(Math.log2(nodes.length + 1));
  const levelHeight = (height - 40) / Math.max(levels, 1);
  
  // Build node positions
  const positions = [];
  const nodeCount = nodes.length;
  
  for (let i = 0; i < nodeCount; i++) {
    if (nodes[i] === null) {
      positions.push(null);
      continue;
    }
    
    const level = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, level) - 1);
    const nodesInLevel = Math.pow(2, level);
    const levelWidth = width / (nodesInLevel + 1);
    
    const x = (posInLevel + 1) * levelWidth;
    const y = 25 + level * levelHeight;
    
    positions.push({ x, y, value: nodes[i], index: i });
  }

  // Build edges
  let edges = '';
  for (let i = 0; i < nodeCount; i++) {
    if (positions[i] === null) continue;
    
    const leftIdx = 2 * i + 1;
    const rightIdx = 2 * i + 2;
    
    if (leftIdx < nodeCount && positions[leftIdx]) {
      const isHighlighted = highlightEdges.some(e => 
        (e[0] === i && e[1] === leftIdx) || (e[0] === leftIdx && e[1] === i)
      );
      edges += `<line x1="${positions[i].x}" y1="${positions[i].y}" 
                      x2="${positions[leftIdx].x}" y2="${positions[leftIdx].y}" 
                      stroke="${isHighlighted ? 'var(--primary)' : 'var(--border-2)'}" 
                      stroke-width="${isHighlighted ? 3 : 2}" />`;
    }
    
    if (rightIdx < nodeCount && positions[rightIdx]) {
      const isHighlighted = highlightEdges.some(e => 
        (e[0] === i && e[1] === rightIdx) || (e[0] === rightIdx && e[1] === i)
      );
      edges += `<line x1="${positions[i].x}" y1="${positions[i].y}" 
                      x2="${positions[rightIdx].x}" y2="${positions[rightIdx].y}" 
                      stroke="${isHighlighted ? 'var(--primary)' : 'var(--border-2)'}" 
                      stroke-width="${isHighlighted ? 3 : 2}" />`;
    }
  }

  // Build nodes
  let nodesSvg = '';
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    if (!pos) continue;
    
    const isHighlighted = highlightNodes.includes(i);
    const label = labels[i] || '';
    
    nodesSvg += `
      <g class="tree-node ${isHighlighted ? 'highlighted' : ''}">
        <circle cx="${pos.x}" cy="${pos.y}" r="${nodeRadius}" 
                fill="${isHighlighted ? 'var(--primary)' : 'var(--surface-3)'}" 
                stroke="${isHighlighted ? 'var(--primary-dark)' : 'var(--border-2)'}" 
                stroke-width="2" />
        <text x="${pos.x}" y="${pos.y}" 
              text-anchor="middle" dominant-baseline="central" 
              fill="${isHighlighted ? 'white' : 'var(--text-1)'}" 
              font-size="12" font-weight="600">${pos.value}</text>
        ${showIndices ? `<text x="${pos.x}" y="${pos.y - nodeRadius - 5}" 
              text-anchor="middle" fill="var(--text-3)" font-size="9">[${i}]</text>` : ''}
        ${label ? `<text x="${pos.x}" y="${pos.y + nodeRadius + 12}" 
              text-anchor="middle" fill="var(--primary)" font-size="10" font-weight="500">${label}</text>` : ''}
      </g>
    `;
  }

  return `
    <svg class="dsa-visual tree-visual" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <g class="tree-edges">${edges}</g>
      <g class="tree-nodes">${nodesSvg}</g>
    </svg>
  `;
}

/**
 * Generate SVG for a linked list visualization
 * @param {Array} values - Array of node values
 * @param {Object} options - Visualization options
 */
export function renderLinkedList(values, options = {}) {
  if (!values || values.length === 0) return '';
  
  const {
    width = 500,
    height = 80,
    nodeWidth = 50,
    nodeHeight = 32,
    highlightNodes = [],
    pointers = {}, // { 0: 'head', 3: 'slow', 5: 'fast' }
    cycleAt = -1, // Index where cycle starts (-1 for no cycle)
    showNull = true,
  } = options;

  const spacing = 20;
  const totalWidth = values.length * (nodeWidth + spacing) + (showNull ? 40 : 0);
  const startX = Math.max(10, (width - totalWidth) / 2);
  const y = height / 2;

  let nodes = '';
  let arrows = '';
  let pointerLabels = '';

  values.forEach((val, i) => {
    const x = startX + i * (nodeWidth + spacing);
    const isHighlighted = highlightNodes.includes(i);
    
    // Node box
    nodes += `
      <g class="ll-node ${isHighlighted ? 'highlighted' : ''}">
        <rect x="${x}" y="${y - nodeHeight/2}" width="${nodeWidth}" height="${nodeHeight}" 
              rx="4" fill="${isHighlighted ? 'var(--primary)' : 'var(--surface-3)'}" 
              stroke="${isHighlighted ? 'var(--primary-dark)' : 'var(--border-2)'}" stroke-width="2" />
        <line x1="${x + nodeWidth - 15}" y1="${y - nodeHeight/2}" 
              x2="${x + nodeWidth - 15}" y2="${y + nodeHeight/2}" 
              stroke="${isHighlighted ? 'var(--primary-dark)' : 'var(--border-2)'}" stroke-width="1" />
        <text x="${x + (nodeWidth - 15)/2}" y="${y}" 
              text-anchor="middle" dominant-baseline="central" 
              fill="${isHighlighted ? 'white' : 'var(--text-1)'}" 
              font-size="13" font-weight="600">${val}</text>
        <circle cx="${x + nodeWidth - 8}" cy="${y}" r="3" 
                fill="${isHighlighted ? 'white' : 'var(--text-2)'}" />
      </g>
    `;

    // Arrow to next
    if (i < values.length - 1) {
      const nextX = startX + (i + 1) * (nodeWidth + spacing);
      arrows += `
        <line x1="${x + nodeWidth}" y1="${y}" x2="${nextX - 5}" y2="${y}" 
              stroke="var(--border-2)" stroke-width="2" marker-end="url(#arrowhead)" />
      `;
    }

    // Pointer label
    if (pointers[i]) {
      pointerLabels += `
        <text x="${x + nodeWidth/2}" y="${y - nodeHeight/2 - 10}" 
              text-anchor="middle" fill="var(--primary)" font-size="11" font-weight="600">${pointers[i]}</text>
        <line x1="${x + nodeWidth/2}" y1="${y - nodeHeight/2 - 5}" 
              x2="${x + nodeWidth/2}" y2="${y - nodeHeight/2}" 
              stroke="var(--primary)" stroke-width="2" marker-end="url(#arrowhead-primary)" />
      `;
    }
  });

  // Null terminator
  if (showNull && cycleAt < 0) {
    const nullX = startX + values.length * (nodeWidth + spacing);
    nodes += `
      <text x="${nullX + 10}" y="${y}" dominant-baseline="central" 
            fill="var(--text-3)" font-size="12" font-style="italic">null</text>
    `;
    arrows += `
      <line x1="${startX + (values.length - 1) * (nodeWidth + spacing) + nodeWidth}" y1="${y}" 
            x2="${nullX}" y2="${y}" stroke="var(--border-2)" stroke-width="2" marker-end="url(#arrowhead)" />
    `;
  }

  // Cycle arrow
  if (cycleAt >= 0) {
    const lastX = startX + (values.length - 1) * (nodeWidth + spacing) + nodeWidth;
    const cycleX = startX + cycleAt * (nodeWidth + spacing) + nodeWidth / 2;
    arrows += `
      <path d="M${lastX} ${y} Q${lastX + 20} ${y + 50} ${cycleX} ${y + nodeHeight/2 + 8}" 
            fill="none" stroke="var(--error)" stroke-width="2" marker-end="url(#arrowhead-cycle)" />
    `;
  }

  return `
    <svg class="dsa-visual ll-visual" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--border-2)" />
        </marker>
        <marker id="arrowhead-primary" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--primary)" />
        </marker>
        <marker id="arrowhead-cycle" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--error)" />
        </marker>
      </defs>
      ${arrows}
      ${nodes}
      ${pointerLabels}
    </svg>
  `;
}

/**
 * Generate SVG for a grid/matrix visualization
 * @param {Array<Array>} grid - 2D array of values
 * @param {Object} options - Visualization options
 */
export function renderGrid(grid, options = {}) {
  if (!grid || grid.length === 0) return '';
  
  const {
    cellSize = 40,
    highlightCells = [], // Array of [row, col]
    pathCells = [], // Array of [row, col] for path
    labelCells = {}, // { '0,0': 'start', '2,3': 'end' }
    showCoords = false,
    colorMap = {}, // { 1: 'var(--primary)', 0: 'var(--surface-2)' }
  } = options;

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const width = cols * cellSize + 40;
  const height = rows * cellSize + 40;
  const startX = 20;
  const startY = 20;

  let cells = '';
  let labels = '';
  let path = '';

  // Draw path if provided
  if (pathCells.length > 1) {
    let pathD = `M${startX + pathCells[0][1] * cellSize + cellSize/2} ${startY + pathCells[0][0] * cellSize + cellSize/2}`;
    for (let i = 1; i < pathCells.length; i++) {
      pathD += ` L${startX + pathCells[i][1] * cellSize + cellSize/2} ${startY + pathCells[i][0] * cellSize + cellSize/2}`;
    }
    path = `<path d="${pathD}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" 
                  stroke-linejoin="round" opacity="0.6" />`;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * cellSize;
      const y = startY + r * cellSize;
      const val = grid[r][c];
      const isHighlighted = highlightCells.some(h => h[0] === r && h[1] === c);
      const isPath = pathCells.some(p => p[0] === r && p[1] === c);
      const cellLabel = labelCells[`${r},${c}`];
      
      let fillColor = 'var(--surface-3)';
      if (colorMap[val] !== undefined) {
        fillColor = colorMap[val];
      } else if (isPath) {
        fillColor = 'var(--primary-light)';
      } else if (isHighlighted) {
        fillColor = 'var(--primary)';
      }

      cells += `
        <rect x="${x}" y="${y}" width="${cellSize - 2}" height="${cellSize - 2}" rx="4"
              fill="${fillColor}" stroke="var(--border-2)" stroke-width="1" />
        <text x="${x + cellSize/2 - 1}" y="${y + cellSize/2}" 
              text-anchor="middle" dominant-baseline="central" 
              fill="${isHighlighted || isPath ? 'white' : 'var(--text-1)'}" 
              font-size="14" font-weight="500">${val}</text>
      `;

      if (cellLabel) {
        labels += `
          <text x="${x + cellSize/2 - 1}" y="${y + cellSize - 8}" 
                text-anchor="middle" fill="var(--primary)" font-size="9" font-weight="600">${cellLabel}</text>
        `;
      }
    }
  }

  // Row/col indices
  let indices = '';
  if (showCoords) {
    for (let c = 0; c < cols; c++) {
      indices += `<text x="${startX + c * cellSize + cellSize/2 - 1}" y="12" 
                        text-anchor="middle" fill="var(--text-3)" font-size="10">${c}</text>`;
    }
    for (let r = 0; r < rows; r++) {
      indices += `<text x="8" y="${startY + r * cellSize + cellSize/2}" 
                        dominant-baseline="central" fill="var(--text-3)" font-size="10">${r}</text>`;
    }
  }

  return `
    <svg class="dsa-visual grid-visual" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      ${path}
      ${cells}
      ${labels}
      ${indices}
    </svg>
  `;
}

/**
 * Generate SVG for a graph visualization
 * @param {Object} graph - { nodes: [...], edges: [[from, to], ...] }
 * @param {Object} options - Visualization options
 */
export function renderGraph(graph, options = {}) {
  const { nodes = [], edges = [] } = graph;
  if (nodes.length === 0) return '';

  const {
    width = 400,
    height = 300,
    nodeRadius = 20,
    directed = false,
    highlightNodes = [],
    highlightEdges = [],
    nodePositions = null, // Custom positions: { 0: {x, y}, 1: {x, y}, ... }
    weighted = false,
    weights = {}, // { '0-1': 5, '1-2': 3 }
  } = options;

  // Calculate positions (circular layout by default)
  const positions = {};
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 50;

  nodes.forEach((node, i) => {
    if (nodePositions && nodePositions[i]) {
      positions[i] = nodePositions[i];
    } else {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      positions[i] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    }
  });

  // Draw edges
  let edgesSvg = '';
  edges.forEach(([from, to]) => {
    const p1 = positions[from];
    const p2 = positions[to];
    if (!p1 || !p2) return;

    const isHighlighted = highlightEdges.some(e => 
      (e[0] === from && e[1] === to) || (!directed && e[0] === to && e[1] === from)
    );

    // Calculate edge endpoints (offset from node center)
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offsetX = (dx / dist) * nodeRadius;
    const offsetY = (dy / dist) * nodeRadius;

    const x1 = p1.x + offsetX;
    const y1 = p1.y + offsetY;
    const x2 = p2.x - offsetX;
    const y2 = p2.y - offsetY;

    edgesSvg += `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
            stroke="${isHighlighted ? 'var(--primary)' : 'var(--border-2)'}" 
            stroke-width="${isHighlighted ? 3 : 2}"
            ${directed ? 'marker-end="url(#graph-arrow)"' : ''} />
    `;

    // Weight label
    if (weighted) {
      const weightKey = `${from}-${to}`;
      const weight = weights[weightKey] || weights[`${to}-${from}`] || '';
      if (weight) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2 - 8;
        edgesSvg += `
          <rect x="${midX - 10}" y="${midY - 8}" width="20" height="16" rx="3" 
                fill="var(--surface-1)" stroke="var(--border-1)" />
          <text x="${midX}" y="${midY + 2}" text-anchor="middle" fill="var(--text-2)" 
                font-size="10" font-weight="500">${weight}</text>
        `;
      }
    }
  });

  // Draw nodes
  let nodesSvg = '';
  nodes.forEach((val, i) => {
    const pos = positions[i];
    const isHighlighted = highlightNodes.includes(i);

    nodesSvg += `
      <g class="graph-node ${isHighlighted ? 'highlighted' : ''}">
        <circle cx="${pos.x}" cy="${pos.y}" r="${nodeRadius}" 
                fill="${isHighlighted ? 'var(--primary)' : 'var(--surface-3)'}" 
                stroke="${isHighlighted ? 'var(--primary-dark)' : 'var(--border-2)'}" 
                stroke-width="2" />
        <text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="central" 
              fill="${isHighlighted ? 'white' : 'var(--text-1)'}" 
              font-size="14" font-weight="600">${val}</text>
      </g>
    `;
  });

  return `
    <svg class="dsa-visual graph-visual" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        <marker id="graph-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--border-2)" />
        </marker>
      </defs>
      ${edgesSvg}
      ${nodesSvg}
    </svg>
  `;
}

/**
 * Generate SVG for an array visualization with optional pointers
 * @param {Array} arr - Array of values
 * @param {Object} options - Visualization options
 */
export function renderArray(arr, options = {}) {
  if (!arr || arr.length === 0) return '';

  const {
    cellWidth = 45,
    cellHeight = 40,
    highlightIndices = [],
    pointers = {}, // { 0: 'i', 3: 'j', 7: 'k' }
    compareIndices = [], // [[2, 5], [3, 6]] - pairs being compared
    sortedRange = [], // [start, end] - range that is sorted
    pivotIndex = -1,
    showIndices = true,
  } = options;

  const width = arr.length * cellWidth + 20;
  const height = cellHeight + (showIndices ? 35 : 10) + (Object.keys(pointers).length > 0 ? 30 : 0);
  const startX = 10;
  const startY = (Object.keys(pointers).length > 0 ? 30 : 10);

  let cells = '';
  let pointerSvg = '';
  let comparisons = '';

  // Draw comparison arcs
  compareIndices.forEach(([i, j]) => {
    const x1 = startX + i * cellWidth + cellWidth / 2;
    const x2 = startX + j * cellWidth + cellWidth / 2;
    const midX = (x1 + x2) / 2;
    const arcHeight = Math.abs(j - i) * 8 + 15;
    
    comparisons += `
      <path d="M${x1} ${startY - 5} Q${midX} ${startY - arcHeight} ${x2} ${startY - 5}" 
            fill="none" stroke="var(--warning)" stroke-width="2" stroke-dasharray="4,2" />
    `;
  });

  arr.forEach((val, i) => {
    const x = startX + i * cellWidth;
    const isHighlighted = highlightIndices.includes(i);
    const isSorted = sortedRange.length === 2 && i >= sortedRange[0] && i <= sortedRange[1];
    const isPivot = i === pivotIndex;

    let fillColor = 'var(--surface-3)';
    if (isPivot) fillColor = 'var(--warning)';
    else if (isHighlighted) fillColor = 'var(--primary)';
    else if (isSorted) fillColor = 'var(--success-light)';

    cells += `
      <rect x="${x}" y="${startY}" width="${cellWidth - 2}" height="${cellHeight}" rx="4"
            fill="${fillColor}" stroke="var(--border-2)" stroke-width="2" />
      <text x="${x + cellWidth/2 - 1}" y="${startY + cellHeight/2}" 
            text-anchor="middle" dominant-baseline="central" 
            fill="${isHighlighted || isPivot ? 'white' : 'var(--text-1)'}" 
            font-size="14" font-weight="600">${val}</text>
    `;

    // Index below
    if (showIndices) {
      cells += `
        <text x="${x + cellWidth/2 - 1}" y="${startY + cellHeight + 15}" 
              text-anchor="middle" fill="var(--text-3)" font-size="10">${i}</text>
      `;
    }

    // Pointer above
    if (pointers[i]) {
      pointerSvg += `
        <text x="${x + cellWidth/2 - 1}" y="12" 
              text-anchor="middle" fill="var(--primary)" font-size="12" font-weight="700">${pointers[i]}</text>
        <line x1="${x + cellWidth/2 - 1}" y1="16" x2="${x + cellWidth/2 - 1}" y2="${startY - 2}" 
              stroke="var(--primary)" stroke-width="2" />
        <polygon points="${x + cellWidth/2 - 1 - 4},${startY - 6} ${x + cellWidth/2 - 1 + 4},${startY - 6} ${x + cellWidth/2 - 1},${startY - 1}" 
                 fill="var(--primary)" />
      `;
    }
  });

  return `
    <svg class="dsa-visual array-visual" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      ${comparisons}
      ${cells}
      ${pointerSvg}
    </svg>
  `;
}

/**
 * Generate spiral matrix visualization
 * @param {number} n - Matrix size
 * @param {number} currentStep - Current step in spiral (for animation)
 */
export function renderSpiralMatrix(n, currentStep = -1) {
  const grid = [];
  for (let i = 0; i < n; i++) {
    grid.push(new Array(n).fill(0));
  }

  // Fill spiral order
  let num = 1;
  let top = 0, bottom = n - 1, left = 0, right = n - 1;
  const order = [];

  while (top <= bottom && left <= right) {
    // Right
    for (let i = left; i <= right; i++) {
      grid[top][i] = num;
      order.push([top, i]);
      num++;
    }
    top++;

    // Down
    for (let i = top; i <= bottom; i++) {
      grid[i][right] = num;
      order.push([i, right]);
      num++;
    }
    right--;

    // Left
    if (top <= bottom) {
      for (let i = right; i >= left; i--) {
        grid[bottom][i] = num;
        order.push([bottom, i]);
        num++;
      }
      bottom--;
    }

    // Up
    if (left <= right) {
      for (let i = bottom; i >= top; i--) {
        grid[i][left] = num;
        order.push([i, left]);
        num++;
      }
      left++;
    }
  }

  // Highlight cells up to currentStep
  const highlightCells = currentStep >= 0 
    ? order.slice(0, currentStep + 1) 
    : [];

  const pathCells = currentStep >= 0 
    ? order.slice(0, currentStep + 1)
    : order;

  return renderGrid(grid, {
    cellSize: 50,
    highlightCells,
    pathCells,
    showCoords: true,
  });
}

/**
 * Generate a trie visualization
 * @param {Array<string>} words - Words to insert
 * @param {Object} options - Options
 */
export function renderTrie(words, options = {}) {
  const {
    width = 500,
    height = 300,
    highlightWord = null,
  } = options;

  // Build trie structure
  const root = { char: '', children: {}, isEnd: false, depth: 0 };
  
  words.forEach(word => {
    let node = root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = { char, children: {}, isEnd: false, depth: node.depth + 1 };
      }
      node = node.children[char];
    }
    node.isEnd = true;
  });

  // Calculate positions using BFS
  const queue = [{ node: root, x: width / 2, y: 30 }];
  const positions = [];
  const edges = [];
  const levelWidth = {};

  // First pass: count nodes per level
  const countByLevel = (node, level) => {
    levelWidth[level] = (levelWidth[level] || 0) + 1;
    Object.values(node.children).forEach(child => countByLevel(child, level + 1));
  };
  countByLevel(root, 0);

  // Second pass: position nodes
  const positionedByLevel = {};
  const positionNode = (node, level, parentX) => {
    const totalAtLevel = levelWidth[level] || 1;
    const idx = positionedByLevel[level] || 0;
    positionedByLevel[level] = idx + 1;

    const levelSpacing = width / (totalAtLevel + 1);
    const x = parentX || (idx + 1) * levelSpacing;
    const y = 30 + level * 50;

    positions.push({ node, x, y });

    Object.values(node.children).forEach(child => {
      edges.push({ from: { x, y }, to: null, child });
      positionNode(child, level + 1, x);
    });
  };

  // Simple layout - position root, then children
  const layoutTrie = (node, x, y, spread) => {
    positions.push({ node, x, y });
    
    const children = Object.values(node.children);
    const childSpread = spread / Math.max(children.length, 1);
    const startX = x - (children.length - 1) * childSpread / 2;

    children.forEach((child, i) => {
      const childX = startX + i * childSpread;
      const childY = y + 50;
      edges.push({ from: { x, y }, to: { x: childX, y: childY } });
      layoutTrie(child, childX, childY, childSpread);
    });
  };

  layoutTrie(root, width / 2, 30, width * 0.8);

  // Draw edges
  let edgesSvg = edges.map(e => `
    <line x1="${e.from.x}" y1="${e.from.y + 15}" x2="${e.to.x}" y2="${e.to.y - 15}" 
          stroke="var(--border-2)" stroke-width="2" />
  `).join('');

  // Draw nodes
  let nodesSvg = positions.map(p => {
    const isRoot = p.node.char === '';
    const isEnd = p.node.isEnd;
    
    return `
      <g>
        <circle cx="${p.x}" cy="${p.y}" r="15" 
                fill="${isEnd ? 'var(--success)' : isRoot ? 'var(--surface-2)' : 'var(--surface-3)'}" 
                stroke="${isEnd ? 'var(--success-dark)' : 'var(--border-2)'}" stroke-width="2" />
        <text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central" 
              fill="${isEnd ? 'white' : 'var(--text-1)'}" font-size="12" font-weight="600">
          ${isRoot ? '∅' : p.node.char}
        </text>
      </g>
    `;
  }).join('');

  return `
    <svg class="dsa-visual trie-visual" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      ${edgesSvg}
      ${nodesSvg}
    </svg>
  `;
}

/**
 * Get pre-built visualization for common DSA problems
 * @param {string} problemId - Problem ID
 * @param {string} problemTitle - Problem title
 * @returns {string} SVG visualization HTML or empty string
 */
export function getProblemVisualization(problemId, problemTitle) {
  const titleLower = (problemTitle || '').toLowerCase();

  // Spiral Matrix
  if (titleLower.includes('spiral') && titleLower.includes('matrix')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="grid-3x3" width="16" height="16"></i>
          Spiral Matrix Visualization
        </div>
        <div class="problem-visual-content">
          ${renderSpiralMatrix(4)}
        </div>
        <div class="problem-visual-caption">
          Numbers show the order of traversal in spiral pattern (right → down → left → up).
        </div>
      </div>
    `;
  }

  // Binary Tree / Tree problems
  if (titleLower.includes('binary tree') || titleLower.includes('bst') || 
      titleLower.includes('inorder') || titleLower.includes('preorder') ||
      titleLower.includes('postorder') || titleLower.includes('level order')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="git-branch" width="16" height="16"></i>
          Binary Tree Structure
        </div>
        <div class="problem-visual-content">
          ${renderBinaryTree([1, 2, 3, 4, 5, 6, 7], { showIndices: true })}
        </div>
        <div class="problem-visual-caption">
          Array representation: parent at i, left child at 2i+1, right child at 2i+2.
        </div>
      </div>
    `;
  }

  // Linked List problems
  if (titleLower.includes('linked list') || titleLower.includes('reverse') && titleLower.includes('list')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="link" width="16" height="16"></i>
          Linked List Structure
        </div>
        <div class="problem-visual-content">
          ${renderLinkedList([1, 2, 3, 4, 5], { pointers: { 0: 'head' } })}
        </div>
        <div class="problem-visual-caption">
          Each node contains data and a pointer to the next node. Last node points to null.
        </div>
      </div>
    `;
  }

  // Cycle detection
  if (titleLower.includes('cycle') || titleLower.includes('detect loop')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="repeat" width="16" height="16"></i>
          Linked List with Cycle
        </div>
        <div class="problem-visual-content">
          ${renderLinkedList([3, 2, 0, -4], { cycleAt: 1, pointers: { 0: 'head' }, showNull: false })}
        </div>
        <div class="problem-visual-caption">
          Floyd's algorithm: slow pointer moves 1 step, fast moves 2 steps. They meet inside the cycle.
        </div>
      </div>
    `;
  }

  // Two pointers
  if (titleLower.includes('two sum') || titleLower.includes('two pointer') || 
      titleLower.includes('container with most water')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="move-horizontal" width="16" height="16"></i>
          Two Pointers Technique
        </div>
        <div class="problem-visual-content">
          ${renderArray([1, 2, 3, 4, 5, 6, 7, 8], { 
            pointers: { 0: 'left', 7: 'right' },
            highlightIndices: [0, 7]
          })}
        </div>
        <div class="problem-visual-caption">
          Two pointers start at opposite ends and move toward each other based on conditions.
        </div>
      </div>
    `;
  }

  // Sliding window
  if (titleLower.includes('sliding window') || titleLower.includes('subarray') ||
      titleLower.includes('substring')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="square-dashed-bottom-code" width="16" height="16"></i>
          Sliding Window Technique
        </div>
        <div class="problem-visual-content">
          ${renderArray([2, 1, 5, 1, 3, 2, 4, 3], { 
            pointers: { 1: 'L', 4: 'R' },
            highlightIndices: [1, 2, 3, 4]
          })}
        </div>
        <div class="problem-visual-caption">
          Window expands (R++) when condition allows, shrinks (L++) when violated.
        </div>
      </div>
    `;
  }

  // Graph problems
  if (titleLower.includes('graph') || titleLower.includes('bfs') || 
      titleLower.includes('dfs') || titleLower.includes('shortest path')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="share-2" width="16" height="16"></i>
          Graph Structure
        </div>
        <div class="problem-visual-content">
          ${renderGraph(
            { nodes: [0, 1, 2, 3, 4], edges: [[0,1], [0,2], [1,3], [2,3], [3,4]] },
            { highlightNodes: [0], directed: false }
          )}
        </div>
        <div class="problem-visual-caption">
          Adjacency list: 0→[1,2], 1→[0,3], 2→[0,3], 3→[1,2,4], 4→[3]
        </div>
      </div>
    `;
  }

  // Trie problems
  if (titleLower.includes('trie') || titleLower.includes('prefix') ||
      titleLower.includes('word search ii') || titleLower.includes('search suggestions')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="network" width="16" height="16"></i>
          Trie Prefix Tree
        </div>
        <div class="problem-visual-content">
          ${renderTrie(
            ['cat', 'car', 'care', 'dog', 'dot'],
            { highlightPath: 'care', width: 420, height: 230 }
          )}
        </div>
        <div class="problem-visual-caption">
          Shared prefixes compress memory and make prefix queries efficient: O(L) for insert/search.
        </div>
      </div>
    `;
  }

  // DP Grid problems
  if ((titleLower.includes('dp') || titleLower.includes('dynamic')) && 
      (titleLower.includes('grid') || titleLower.includes('path'))) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="table-2" width="16" height="16"></i>
          DP Grid Visualization
        </div>
        <div class="problem-visual-content">
          ${renderGrid(
            [[1, 3, 1], [1, 5, 1], [4, 2, 1]],
            { 
              pathCells: [[0,0], [0,1], [0,2], [1,2], [2,2]],
              labelCells: { '0,0': 'start', '2,2': 'end' },
              showCoords: true
            }
          )}
        </div>
        <div class="problem-visual-caption">
          DP[i][j] = min cost to reach cell (i,j). Fill row by row, using recurrence relation.
        </div>
      </div>
    `;
  }

  // Matrix/grid explicit problems
  if (titleLower.includes('matrix') || titleLower.includes('grid') || titleLower.includes('island')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="grid-2x2" width="16" height="16"></i>
          Grid State Visualization
        </div>
        <div class="problem-visual-content">
          ${renderGrid(
            [[1, 1, 0, 0], [1, 0, 0, 1], [1, 1, 1, 1], [0, 0, 1, 1]],
            {
              highlightCells: [[0,0], [0,1], [1,0], [2,0], [2,1], [2,2], [2,3], [3,2], [3,3]],
              showCoords: true,
              colorMap: { 1: 'rgba(233,88,73,0.25)', 0: 'var(--surface-2)' }
            }
          )}
        </div>
        <div class="problem-visual-caption">
          Model each cell as a state and track transitions (up/down/left/right) with visited marking.
        </div>
      </div>
    `;
  }

  // Merge intervals
  if (titleLower.includes('interval') || titleLower.includes('merge')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="git-merge" width="16" height="16"></i>
          Interval Merging
        </div>
        <div class="problem-visual-content">
          <svg class="dsa-visual" viewBox="0 0 400 100" width="400" height="100">
            <line x1="20" y1="70" x2="380" y2="70" stroke="var(--border-2)" stroke-width="2"/>
            <!-- Intervals -->
            <rect x="40" y="25" width="60" height="20" rx="3" fill="var(--primary)" opacity="0.6"/>
            <text x="70" y="38" text-anchor="middle" fill="white" font-size="11">[1,3]</text>
            <rect x="80" y="25" width="40" height="20" rx="3" fill="var(--warning)" opacity="0.6"/>
            <text x="100" y="38" text-anchor="middle" fill="white" font-size="11">[2,4]</text>
            <rect x="200" y="25" width="80" height="20" rx="3" fill="var(--success)" opacity="0.6"/>
            <text x="240" y="38" text-anchor="middle" fill="white" font-size="11">[6,8]</text>
            <!-- Merged -->
            <rect x="40" y="55" width="100" height="20" rx="3" fill="var(--primary)"/>
            <text x="90" y="68" text-anchor="middle" fill="white" font-size="11">[1,4]</text>
            <rect x="200" y="55" width="80" height="20" rx="3" fill="var(--success)"/>
            <text x="240" y="68" text-anchor="middle" fill="white" font-size="11">[6,8]</text>
            <!-- Labels -->
            <text x="10" y="38" fill="var(--text-3)" font-size="10">Input</text>
            <text x="10" y="68" fill="var(--text-3)" font-size="10">Result</text>
          </svg>
        </div>
        <div class="problem-visual-caption">
          Sort by start time, then merge overlapping intervals where end₁ ≥ start₂.
        </div>
      </div>
    `;
  }

  // Stack problems
  if (titleLower.includes('stack') || titleLower.includes('parentheses') || 
      titleLower.includes('bracket') || titleLower.includes('valid')) {
    return `
      <div class="problem-visual-container">
        <div class="problem-visual-title">
          <i data-lucide="layers" width="16" height="16"></i>
          Stack Operations
        </div>
        <div class="problem-visual-content">
          <svg class="dsa-visual" viewBox="0 0 200 150" width="200" height="150">
            <rect x="50" y="10" width="100" height="130" rx="4" fill="none" stroke="var(--border-2)" stroke-width="2"/>
            <rect x="55" y="110" width="90" height="25" rx="2" fill="var(--primary)" opacity="0.8"/>
            <text x="100" y="126" text-anchor="middle" fill="white" font-size="14">(</text>
            <rect x="55" y="80" width="90" height="25" rx="2" fill="var(--success)" opacity="0.8"/>
            <text x="100" y="96" text-anchor="middle" fill="white" font-size="14">{</text>
            <rect x="55" y="50" width="90" height="25" rx="2" fill="var(--warning)" opacity="0.8"/>
            <text x="100" y="66" text-anchor="middle" fill="white" font-size="14">[</text>
            <text x="100" y="30" text-anchor="middle" fill="var(--text-3)" font-size="10">← top</text>
            <text x="175" y="75" fill="var(--text-3)" font-size="10" transform="rotate(90, 175, 75)">LIFO</text>
          </svg>
        </div>
        <div class="problem-visual-caption">
          Push opening brackets, pop and match when closing bracket encountered.
        </div>
      </div>
    `;
  }

  return '';
}

// Export all functions
export default {
  renderBinaryTree,
  renderLinkedList,
  renderGrid,
  renderGraph,
  renderArray,
  renderSpiralMatrix,
  renderTrie,
  getProblemVisualization,
};
