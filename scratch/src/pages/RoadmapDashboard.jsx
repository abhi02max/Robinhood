import React, { useState, useEffect } from 'react';
import LeaderboardWidget from '../components/LeaderboardWidget';
import StreakWidget from '../components/StreakWidget';

export default function RoadmapDashboard({ userId = 'mock-uuid-for-demo' }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateRoadmap = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetRole: 'Software Engineer' })
      });
      const data = await res.json();
      if (data.ok) {
        setSchedule(data.schedule);
      } else {
        setError(data.reason || 'Failed to generate roadmap');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">My Journey</h1>
          <p className="text-gray-400">Your personalized Socratic syllabus and competitive standings.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Roadmap Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Curriculum Roadmap</h2>
                  <p className="text-sm text-gray-500 mt-1">AI-generated schedule bound to your executed progress.</p>
                </div>
                <button 
                  onClick={generateRoadmap}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                >
                  {loading ? 'Generating...' : 'Refresh Roadmap'}
                </button>
              </div>

              {error && <div className="p-4 bg-red-900/30 text-red-400 border border-red-800 rounded mb-4">{error}</div>}

              {schedule.length === 0 && !loading && !error && (
                <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                  <div className="text-4xl mb-4">🗺️</div>
                  <h3 className="text-gray-300 font-bold mb-2">No Roadmap Generated</h3>
                  <p className="text-gray-500 text-sm">Click refresh to pull the strictly ordered SQL schema into a timeline.</p>
                </div>
              )}

              {schedule.length > 0 && (
                <div className="space-y-4">
                  {schedule.map((task, index) => (
                    <div key={index} className="flex flex-col relative">
                      {/* Connector Line */}
                      {index !== schedule.length - 1 && (
                        <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-gray-800 -mb-4 z-0"></div>
                      )}
                      
                      <div className="flex gap-4 items-start relative z-10">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center font-black text-gray-400 shadow-md">
                          D{task.day}
                        </div>
                        <div className="flex-1 bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1 block">
                                {task.category}
                              </span>
                              <h4 className="text-lg font-bold text-gray-200">{task.title}</h4>
                            </div>
                            <span className="px-2 py-1 bg-blue-900/40 text-blue-300 text-xs font-semibold rounded-md border border-blue-800/50">
                              {task.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Gamification */}
          <div className="lg:col-span-1 space-y-6 flex flex-col">
            <StreakWidget currentStreak={4} maxStreak={12} todayCompleted={true} />
            <div className="flex-1">
              <LeaderboardWidget />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
