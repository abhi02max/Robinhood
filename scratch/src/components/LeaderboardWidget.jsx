import React, { useState, useEffect } from 'react';

export default function LeaderboardWidget() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/gamification/leaderboard');
        const data = await res.json();
        if (data.ok) {
          setLeaderboard(data.leaderboard || []);
        } else {
          setError(data.log || 'Failed to fetch leaderboard');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (loading) return <div className="p-4 bg-gray-900 rounded-lg shadow animate-pulse h-64 border border-gray-800"></div>;

  return (
    <div className="leaderboard-widget p-5 bg-gray-900 rounded-xl shadow-2xl border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <span className="text-yellow-400">🏆</span> Global Leaderboard
        </h3>
      </div>
      
      {error ? (
        <div className="text-red-400 text-sm">{error}</div>
      ) : (
        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-gray-500 text-sm italic py-4 text-center">No rankings available yet. Start solving!</div>
          ) : (
            leaderboard.map((user, index) => (
              <div 
                key={user.user_id || index} 
                className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 font-bold text-xs text-gray-300">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-200">
                    {user.username || 'Anonymous Hacker'}
                  </span>
                </div>
                <div className="flex gap-4 text-sm font-mono">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Solved</span>
                    <span className="text-blue-400 font-bold">{user.solved_count}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Streak</span>
                    <span className="text-orange-400 font-bold">{user.streak} 🔥</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
