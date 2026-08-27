export const ACHIEVEMENT_DEFS = [
  { id: 'first-blood', name: 'First Blood', emoji: '🩸', desc: 'Solve 1 problem', metric: 'solved', target: 1 },
  { id: 'getting-started', name: 'Getting Started', emoji: '🌱', desc: 'Solve 5 problems', metric: 'solved', target: 5 },
  { id: 'double-digits', name: 'Double Digits', emoji: '🔟', desc: 'Solve 10 problems', metric: 'solved', target: 10 },
  { id: 'quarter-century', name: 'Quarter Century', emoji: '⚡', desc: 'Solve 25 problems', metric: 'solved', target: 25 },
  { id: 'half-century', name: 'Half Century', emoji: '🌟', desc: 'Solve 50 problems', metric: 'solved', target: 50 },
  { id: 'seventy-five', name: 'Steady 75', emoji: '📈', desc: 'Solve 75 problems', metric: 'solved', target: 75 },
  { id: 'century-club', name: 'Century Club', emoji: '💯', desc: 'Solve 100 problems', metric: 'solved', target: 100 },
  { id: 'one-fifty', name: 'One-Fifty Force', emoji: '🚀', desc: 'Solve 150 problems', metric: 'solved', target: 150 },
  { id: 'bicentennial', name: 'Bicentennial', emoji: '🏆', desc: 'Solve 200 problems', metric: 'solved', target: 200 },
  { id: 'triple-century', name: 'Triple Century', emoji: '👑', desc: 'Solve 300 problems', metric: 'solved', target: 300 },
  { id: 'three-fifty', name: '350 Vanguard', emoji: '🦅', desc: 'Solve 350 problems', metric: 'solved', target: 350 },
  { id: 'four-hundred', name: '400 Apex', emoji: '🌌', desc: 'Solve 400 problems', metric: 'solved', target: 400 },
  { id: 'four-twenty-five', name: '425 Grindstone', emoji: '🪨', desc: 'Solve 425 problems', metric: 'solved', target: 425 },
  { id: 'completionist', name: 'Completionist', emoji: '🎯', desc: 'Solve 450+ problems', metric: 'solved', target: 450 },

  { id: 'streak-3', name: 'Warm Streak', emoji: '🔥', desc: '3-day streak', metric: 'streak', target: 3 },
  { id: 'week-warrior', name: 'Week Warrior', emoji: '🧨', desc: '7-day streak', metric: 'streak', target: 7 },
  { id: 'two-week-titan', name: 'Fortnight Force', emoji: '⚔️', desc: '14-day streak', metric: 'streak', target: 14 },
  { id: 'month-master', name: 'Month Master', emoji: '🗓️', desc: '30-day streak', metric: 'streak', target: 30 },
  { id: 'streak-45', name: 'Focus Forge', emoji: '🔨', desc: '45-day streak', metric: 'streak', target: 45 },
  { id: 'streak-60', name: 'Unbreakable', emoji: '🛡️', desc: '60-day streak', metric: 'streak', target: 60, hidden: true },
  { id: 'streak-90', name: 'Quarter Titan', emoji: '🧱', desc: '90-day streak', metric: 'streak', target: 90, hidden: true },
  { id: 'streak-120', name: 'Iron Discipline', emoji: '⛓️', desc: '120-day streak', metric: 'streak', target: 120, hidden: true },
  { id: 'streak-180', name: 'Half-Year Hero', emoji: '🏔️', desc: '180-day streak', metric: 'streak', target: 180, hidden: true },

  { id: 'easy-10', name: 'Easy Warmup', emoji: '🍃', desc: 'Solve 10 Easy problems', metric: 'easy', target: 10 },
  { id: 'easy-25', name: 'Easy Engine', emoji: '🧩', desc: 'Solve 25 Easy problems', metric: 'easy', target: 25 },
  { id: 'easy-sweep', name: 'Easy Sweep', emoji: '🧹', desc: 'Solve 50 Easy problems', metric: 'easy', target: 50 },
  { id: 'easy-100', name: 'Easy Atlas', emoji: '🧭', desc: 'Solve 100 Easy problems', metric: 'easy', target: 100 },
  { id: 'medium-10', name: 'Medium Warmup', emoji: '🛠️', desc: 'Solve 10 Medium problems', metric: 'medium', target: 10 },
  { id: 'medium-25', name: 'Midfield', emoji: '⚙️', desc: 'Solve 25 Medium problems', metric: 'medium', target: 25 },
  { id: 'medium-grinder', name: 'Grinder', emoji: '🔧', desc: 'Solve 50 Medium problems', metric: 'medium', target: 50 },
  { id: 'medium-100', name: 'Medium Matrix', emoji: '🧠', desc: 'Solve 100 Medium problems', metric: 'medium', target: 100 },
  { id: 'hard-5', name: 'Hard Initiate', emoji: '🥋', desc: 'Solve 5 Hard problems', metric: 'hard', target: 5 },
  { id: 'hard-hitter', name: 'Hard Hitter', emoji: '💪', desc: 'Solve 10 Hard problems', metric: 'hard', target: 10 },
  { id: 'hard-master', name: 'Hard Master', emoji: '🐉', desc: 'Solve 25 Hard problems', metric: 'hard', target: 25 },
  { id: 'hard-40', name: 'Hard Summit', emoji: '🗻', desc: 'Solve 40 Hard problems', metric: 'hard', target: 40 },
  { id: 'hard-60', name: 'Hard Oracle', emoji: '🧿', desc: 'Solve 60 Hard problems', metric: 'hard', target: 60, hidden: true },
  { id: 'balanced-5', name: 'Balanced Start', emoji: '🎚️', desc: 'Solve 5 of each difficulty', metric: 'balanced', target: 5 },
  { id: 'balanced', name: 'Balanced', emoji: '⚖️', desc: 'Solve 10 of each difficulty', metric: 'balanced', target: 10 },
  { id: 'balanced-20', name: 'Balanced 20', emoji: '🧬', desc: 'Solve 20 of each difficulty', metric: 'balanced', target: 20 },
  { id: 'balanced-35', name: 'Balanced Mastery', emoji: '🏹', desc: 'Solve 35 of each difficulty', metric: 'balanced', target: 35 },
  { id: 'xp-250', name: 'XP Ignite', emoji: '✨', desc: 'Reach 250 XP', metric: 'xp', target: 250 },
  { id: 'xp-500', name: 'XP Charge', emoji: '🔋', desc: 'Reach 500 XP', metric: 'xp', target: 500 },
  { id: 'xp-1000', name: 'XP Hoarder', emoji: '💠', desc: 'Reach 1000 XP', metric: 'xp', target: 1000, hidden: true },
  { id: 'xp-2500', name: 'XP Reactor', emoji: '⚛️', desc: 'Reach 2500 XP', metric: 'xp', target: 2500, hidden: true },
  { id: 'xp-5000', name: 'XP Legend', emoji: '🌠', desc: 'Reach 5000 XP', metric: 'xp', target: 5000, hidden: true },
];

export function metricValue(metric, stats) {
  switch (metric) {
    case 'solved':
      return Number(stats.solved || 0);
    case 'streak':
      return Number(stats.streak || 0);
    case 'easy':
      return Number(stats.byDiff?.Easy || 0);
    case 'medium':
      return Number(stats.byDiff?.Medium || 0);
    case 'hard':
      return Number(stats.byDiff?.Hard || 0);
    case 'xp':
      return Number(stats.xp || 0);
    case 'balanced':
      return Math.min(
        Number(stats.byDiff?.Easy || 0),
        Number(stats.byDiff?.Medium || 0),
        Number(stats.byDiff?.Hard || 0)
      );
    default:
      return 0;
  }
}

export function computeAchievementProgress(def, stats) {
  const current = metricValue(def.metric, stats);
  const target = Number(def.target || 1);
  const pct = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
  return {
    current,
    target,
    unlocked: current >= target,
    percentage: pct,
  };
}

export function evaluateAchievements(stats) {
  return ACHIEVEMENT_DEFS.filter((def) => computeAchievementProgress(def, stats).unlocked).map((def) => def.id);
}
