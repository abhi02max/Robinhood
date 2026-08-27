import React, { useState, useEffect } from 'react';

const generateSlug = (title) => {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

/**
 * CurriculumView
 * 
 * Renders the massive dataset of Topics -> Patterns -> Problems.
 */
export const CurriculumView = ({ curriculumData, initialSolvedProblems = [] }) => {
  const [solvedProblems, setSolvedProblems] = useState(initialSolvedProblems);
  const [selectedTopic, setSelectedTopic] = useState(curriculumData.topics[0]);
  const [selectedPattern, setSelectedPattern] = useState(curriculumData.topics[0].patterns[0]);

  useEffect(() => {
    setSolvedProblems(initialSolvedProblems);
  }, [initialSolvedProblems]);

  const handleMarkSolved = async (problemTitle) => {
    const slug = generateSlug(problemTitle);
    if (solvedProblems.includes(slug)) return;
    setSolvedProblems(prev => [...prev, slug]);
    try {
      await fetch('/api/learning/progress/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_slug: slug })
      });
    } catch (error) {
      console.error('Failed to mark solved', error);
    }
  };

  const patternProblems = selectedPattern.problems.map((p, idx) => {
    const slug = generateSlug(p.title);
    const isSolved = solvedProblems.includes(slug);
    const prevSlug = idx > 0 ? generateSlug(selectedPattern.problems[idx - 1].title) : null;
    const isUnlocked = idx === 0 || solvedProblems.includes(prevSlug);
    return { ...p, slug, isSolved, isUnlocked };
  });

  const solvedCount = patternProblems.filter(p => p.isSolved).length;
  const completionPercentage = Math.round((solvedCount / patternProblems.length) * 100) || 0;
  const nextProblem = patternProblems.find(p => !p.isSolved && p.isUnlocked);

  const handleStartLearning = () => {
    if (nextProblem) {
      const el = document.getElementById(`problem-${nextProblem.slug}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR: Topics & Patterns Navigation */}
      <div className="w-80 h-full border-r border-slate-700 bg-slate-950 flex flex-col overflow-y-auto scrollbar-hide">
        <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">
          <h1 className="text-xl font-bold text-white tracking-tight">DSA Curriculum</h1>
          <p className="text-xs text-slate-400 mt-1">15 Topics • 60 Patterns • 1,800 Problems</p>
        </div>

        <div className="p-4 space-y-2">
          {curriculumData.topics.map((topic, tIdx) => (
            <div key={tIdx} className="space-y-1">
              {/* Topic Header */}
              <button 
                onClick={() => setSelectedTopic(topic)}
                className={`w-full text-left px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  selectedTopic.name === topic.name 
                    ? 'bg-slate-800 text-emerald-400' 
                    : 'hover:bg-slate-800/50 text-slate-300'
                }`}
              >
                {topic.name}
              </button>

              {/* Patterns List (Accordion style) */}
              {selectedTopic.name === topic.name && (
                <div className="pl-4 space-y-1 border-l-2 border-slate-800 ml-4 mb-4">
                  {topic.patterns.map((pattern, pIdx) => {
                    const patProblems = pattern.problems;
                    const patSolvedCount = patProblems.filter(p => solvedProblems.includes(generateSlug(p.title))).length;
                    const patCompletion = Math.round((patSolvedCount / patProblems.length) * 100) || 0;
                    return (
                    <button
                      key={pIdx}
                      onClick={() => setSelectedPattern(pattern)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors ${
                        selectedPattern.name === pattern.name
                          ? 'bg-emerald-500/10 text-emerald-300 font-medium'
                          : 'hover:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="truncate pr-2 text-left">{pattern.name}</span>
                      <span className="shrink-0 text-[10px] font-mono opacity-60">{patCompletion}%</span>
                    </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT MAIN AREA: Pattern Details & Problem List */}
      <div className="flex-1 h-full overflow-y-auto bg-slate-900">
        
        {/* Pattern Hero Section */}
        <div className="p-10 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full mb-4 uppercase tracking-wider">
                {selectedTopic.name}
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">{selectedPattern.name}</h2>
              <div className="flex items-center gap-4 text-sm mt-4">
                <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
                </div>
                <span className="text-slate-400 font-mono">{completionPercentage}% Complete</span>
              </div>
            </div>
            
            <button 
              onClick={handleStartLearning}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
            >
              {completionPercentage === 0 ? 'Start Learning' : completionPercentage === 100 ? 'Review Pattern' : 'Resume Learning'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Concept</h3>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  {selectedPattern.concept}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">When to Use</h3>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  {selectedPattern.whenToUse}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-rose-400/80 uppercase tracking-wide mb-2">Common Mistakes</h3>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed bg-rose-950/20 p-4 rounded-xl border border-rose-900/30">
                  {selectedPattern.commonMistakes}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <span className="block text-xs text-slate-500 uppercase mb-1">Time Complexity</span>
                  <span className="font-mono text-amber-400 text-sm">{selectedPattern.timeComplexity}</span>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <span className="block text-xs text-slate-500 uppercase mb-1">Space Complexity</span>
                  <span className="font-mono text-emerald-400 text-sm">{selectedPattern.spaceComplexity}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Problems Table */}
        <div className="p-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Pattern Practice Sets</h3>
            <span className="text-sm font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
              {solvedCount} / {patternProblems.length} Solved
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  <th className="p-4 font-semibold w-16 text-center">Status</th>
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold">Difficulty</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {patternProblems.map((problem, idx) => (
                  <tr 
                    key={idx} 
                    id={`problem-${problem.slug}`}
                    className={`transition-colors group ${problem.isUnlocked ? 'hover:bg-slate-800/40' : 'opacity-40 grayscale pointer-events-none'}`}
                  >
                    <td className="p-4 text-center">
                      <div className={`w-6 h-6 mx-auto rounded-full border-2 flex items-center justify-center transition-colors ${
                        problem.isSolved 
                          ? 'bg-emerald-500 border-emerald-500 text-slate-900' 
                          : problem.isUnlocked
                            ? 'border-slate-500'
                            : 'border-slate-700 bg-slate-800'
                      }`}>
                        {problem.isSolved ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : !problem.isUnlocked ? (
                          <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-200">
                      {problem.title}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                        problem.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                        problem.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {!problem.isSolved && problem.isUnlocked && (
                        <button 
                          onClick={() => handleMarkSolved(problem.title)}
                          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 text-white text-xs font-bold rounded-lg transition-all"
                        >
                          Mark Solved
                        </button>
                      )}
                      {problem.isSolved && (
                        <span className="text-xs font-bold text-emerald-500/50 uppercase tracking-wide px-4 py-1.5">
                          Completed
                        </span>
                      )}
                      {!problem.isUnlocked && (
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide px-4 py-1.5">
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CurriculumView;
