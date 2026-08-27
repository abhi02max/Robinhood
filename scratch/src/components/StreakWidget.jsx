import React from 'react';

export default function StreakWidget({ currentStreak = 0, maxStreak = 0, todayCompleted = false }) {
  // Array to visualize the last 7 days (mock visual for this widget)
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const mockActivity = [true, true, false, true, true, true, todayCompleted];

  return (
    <div className="streak-widget p-5 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl border border-gray-700/50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Current Streak</h3>
          <div className="text-3xl font-black text-white flex items-end gap-2">
            {currentStreak} <span className="text-xl text-orange-500 animate-pulse">🔥</span>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Best Streak</h3>
          <div className="text-xl font-bold text-gray-300">
            {maxStreak} <span className="text-sm">Days</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center px-2">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300
              ${mockActivity[i] 
                ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' 
                : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
            >
              {mockActivity[i] && '✓'}
            </div>
            <span className="text-[10px] uppercase font-bold text-gray-500">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
