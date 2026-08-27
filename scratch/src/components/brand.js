// ============================================
// ROBINHOOD FOR GOOD — BRAND SYSTEM
// Premium, original, distinctive identity
// ============================================

/**
 * Main Brand Logo — Full version with icon and text
 * A rising arrow through a "R" shape symbolizing upward growth and learning
 */
export function robinhoodBrandMark(size = 22) {
  // Use CSS variables for theme-aware colors
  return `
    <svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Robinhood for Good" role="img">
      <defs>
        <linearGradient id="rhBrandGrad-${size}" x1="4" y1="44" x2="44" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="var(--primary, #E95849)"/>
          <stop offset="100%" stop-color="var(--accent, #E9A149)"/>
        </linearGradient>
        <linearGradient id="rhBrandGradReverse-${size}" x1="44" y1="4" x2="4" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="var(--accent, #E9A149)"/>
          <stop offset="100%" stop-color="var(--primary, #E95849)"/>
        </linearGradient>
      </defs>
      <!-- Background circle with subtle border -->
      <circle cx="24" cy="24" r="22" fill="var(--surface-1, #1a1816)" stroke="url(#rhBrandGrad-${size})" stroke-width="1.5" stroke-opacity="0.4"/>
      <!-- Abstract "R" shape with rising arrow -->
      <path 
        d="M14 38V14C14 11.8 15.8 10 18 10H28C32.4 10 36 13.6 36 18C36 21.5 33.8 24.5 30.7 25.6L38 38" 
        stroke="url(#rhBrandGrad-${size})" 
        stroke-width="3.5" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        fill="none"
      />
      <!-- Rising arrow through the R -->
      <path 
        d="M22 34L22 20L32 10" 
        stroke="url(#rhBrandGradReverse-${size})" 
        stroke-width="3" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        fill="none"
      />
      <!-- Arrow head -->
      <path 
        d="M28 14L32 10L36 14" 
        stroke="var(--accent, #E9A149)" 
        stroke-width="2.5" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        fill="none"
      />
      <!-- Accent dot representing goal/achievement -->
      <circle cx="22" cy="34" r="2.5" fill="var(--primary, #E95849)"/>
    </svg>
  `;
}

/**
 * Compact icon mark — for favicon, small displays
 */
export function robinhoodIconMark(size = 16) {
  return `
    <svg viewBox="0 0 32 32" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="RG" role="img">
      <defs>
        <linearGradient id="rhIconGrad-${size}" x1="2" y1="30" x2="30" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="var(--primary, #E95849)"/>
          <stop offset="100%" stop-color="var(--accent, #E9A149)"/>
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="6" fill="var(--surface-1, #1a1816)" stroke="url(#rhIconGrad-${size})" stroke-width="1"/>
      <!-- Simplified rising R -->
      <path d="M9 25V9C9 7.9 9.9 7 11 7H18C20.8 7 23 9.2 23 12C23 14.2 21.6 16.1 19.6 16.7L24 25" stroke="url(#rhIconGrad-${size})" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 22V14L21 7" stroke="var(--accent, #E9A149)" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

/**
 * Text logo with wordmark
 */
export function robinhoodWordmark(options = {}) {
  const { size = 'md', showTagline = true, className = '' } = options;
  
  const sizes = {
    sm: { title: '18px', tagline: '10px', gap: '2px' },
    md: { title: '24px', tagline: '12px', gap: '4px' },
    lg: { title: '32px', tagline: '14px', gap: '6px' },
    xl: { title: '40px', tagline: '16px', gap: '8px' },
  };
  
  const s = sizes[size] || sizes.md;
  
  return `
    <div class="rh-wordmark ${className}" style="display:flex;flex-direction:column;gap:${s.gap};">
      <span style="
        font-family: var(--font-heading);
        font-size: ${s.title};
        font-weight: 700;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      ">Robinhood</span>
      ${showTagline ? `
        <span style="
          font-family: var(--font-heading);
          font-size: ${s.tagline};
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent);
        ">For Good</span>
      ` : ''}
    </div>
  `;
}

/**
 * Full brand lockup — icon + wordmark
 */
export function robinhoodBrandLockup(options = {}) {
  const { iconSize = 32, textSize = 'md', showTagline = true, layout = 'horizontal' } = options;
  
  const flexDirection = layout === 'vertical' ? 'column' : 'row';
  const alignItems = layout === 'vertical' ? 'center' : 'center';
  const gap = layout === 'vertical' ? '8px' : '12px';
  
  return `
    <div class="rh-brand-lockup" style="display:flex;flex-direction:${flexDirection};align-items:${alignItems};gap:${gap};">
      ${robinhoodBrandMark(iconSize)}
      ${robinhoodWordmark({ size: textSize, showTagline })}
    </div>
  `;
}

/**
 * Subject-specific icons for CS modules
 */
export const SUBJECT_ICONS = {
  os: {
    name: 'Operating Systems',
    color: '#3B82F6',
    icon: (size = 20) => `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="2" x2="9" y2="4"/>
        <line x1="15" y1="2" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="22"/>
        <line x1="15" y1="20" x2="15" y2="22"/>
        <line x1="2" y1="9" x2="4" y2="9"/>
        <line x1="2" y1="15" x2="4" y2="15"/>
        <line x1="20" y1="9" x2="22" y2="9"/>
        <line x1="20" y1="15" x2="22" y2="15"/>
      </svg>
    `
  },
  cn: {
    name: 'Computer Networks',
    color: '#10B981',
    icon: (size = 20) => `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    `
  },
  dbms: {
    name: 'Database Systems',
    color: '#8B5CF6',
    icon: (size = 20) => `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    `
  },
  oops: {
    name: 'Object-Oriented Programming',
    color: '#F59E0B',
    icon: (size = 20) => `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <line x1="10" y1="6.5" x2="14" y2="6.5"/>
        <line x1="6.5" y1="10" x2="6.5" y2="14"/>
        <line x1="17.5" y1="10" x2="17.5" y2="14"/>
      </svg>
    `
  },
  sd: {
    name: 'System Design',
    color: '#EC4899',
    icon: (size = 20) => `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#EC4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    `
  },
  dsa: {
    name: 'Data Structures & Algorithms',
    color: '#E95849',
    icon: (size = 20) => `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#E95849" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
        <line x1="12" y1="2" x2="12" y2="22"/>
      </svg>
    `
  }
};

/**
 * Get subject icon by ID
 */
export function getSubjectIcon(subjectId, size = 20) {
  const subject = SUBJECT_ICONS[subjectId.toLowerCase()];
  if (!subject) return '';
  return subject.icon(size);
}

/**
 * Category badge with color
 */
export function categoryBadge(category, options = {}) {
  const { size = 'sm', showIcon = true } = options;
  
  const sizes = {
    xs: { padding: '2px 6px', fontSize: '10px', iconSize: 12 },
    sm: { padding: '4px 8px', fontSize: '12px', iconSize: 14 },
    md: { padding: '6px 12px', fontSize: '14px', iconSize: 16 },
  };
  
  const s = sizes[size] || sizes.sm;
  
  // Color mapping for DSA categories
  const colors = {
    'arrays': '#6366f1',
    'two-pointers': '#8b5cf6',
    'sliding-window': '#a855f7',
    'stack': '#d946ef',
    'queue': '#ec4899',
    'linked-list': '#f43f5e',
    'binary-search': '#ef4444',
    'sorting': '#f97316',
    'matrix': '#f59e0b',
    'strings': '#eab308',
    'recursion': '#84cc16',
    'backtracking': '#22c55e',
    'binary-tree': '#10b981',
    'bst': '#14b8a6',
    'heap': '#06b6d4',
    'graph-bfs-dfs': '#0ea5e9',
    'graph-advanced': '#3b82f6',
    'dp-1d': '#6366f1',
    'dp-2d': '#8b5cf6',
    'dp-advanced': '#a855f7',
    'greedy': '#d946ef',
    'trie': '#ec4899',
    'segment-tree': '#f43f5e',
    'math': '#ef4444',
    'bit-manipulation': '#f97316',
    'design': '#f59e0b',
  };
  
  const color = colors[category.toLowerCase()] || 'var(--text-3)';
  const displayName = category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  return `
    <span class="category-badge" style="
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: ${s.padding};
      font-size: ${s.fontSize};
      font-weight: 500;
      color: ${color};
      background: ${color}18;
      border-radius: var(--radius-sm);
      border: 1px solid ${color}30;
    ">
      ${showIcon ? `<span style="width:${s.iconSize}px;height:${s.iconSize}px;background:${color};border-radius:50%;opacity:0.8;"></span>` : ''}
      ${displayName}
    </span>
  `;
}

/**
 * Difficulty badge
 */
export function difficultyBadge(difficulty, size = 'sm') {
  const colors = {
    easy: { bg: '#22c55e20', text: '#22c55e', border: '#22c55e40' },
    medium: { bg: '#f59e0b20', text: '#f59e0b', border: '#f59e0b40' },
    hard: { bg: '#ef444420', text: '#ef4444', border: '#ef444440' },
  };
  
  const sizes = {
    xs: { padding: '2px 6px', fontSize: '10px' },
    sm: { padding: '4px 8px', fontSize: '12px' },
    md: { padding: '6px 12px', fontSize: '14px' },
  };
  
  const c = colors[difficulty.toLowerCase()] || colors.medium;
  const s = sizes[size] || sizes.sm;
  
  return `
    <span class="difficulty-badge difficulty-${difficulty.toLowerCase()}" style="
      display: inline-block;
      padding: ${s.padding};
      font-size: ${s.fontSize};
      font-weight: 600;
      color: ${c.text};
      background: ${c.bg};
      border: 1px solid ${c.border};
      border-radius: var(--radius-sm);
      text-transform: capitalize;
    ">${difficulty}</span>
  `;
}

