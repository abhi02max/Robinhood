import React, { useState } from 'react';

export default function DebuggerUI({ problemTitle, codeSnippet, variablesToTrace = '' }) {
  const [traceState, setTraceState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState('');

  const runSimulatedTrace = async () => {
    if (!codeSnippet) return;
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3000/api/ai/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemTitle, codeSnippet, variablesToTrace })
      });
      const data = await response.json();
      
      if (!data.ok) throw new Error(data.reason || data.stderr || 'Failed to simulate trace');
      setTraceState(data.trace);
      setCurrentStepIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (traceState && currentStepIndex < traceState.length - 1) setCurrentStepIndex(prev => prev + 1);
  };
  
  const handlePrev = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
  };

  return (
    <div className="debugger-ui-container p-4 bg-gray-900 text-gray-200 rounded-lg shadow-md border border-gray-700">
      <div className="header flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold tracking-wide uppercase text-blue-400 font-sans">AI Execution Simulator</h3>
        <button 
          onClick={runSimulatedTrace} 
          disabled={loading || !codeSnippet}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? 'Simulating...' : 'Generate Trace'}
        </button>
      </div>

      {error && <div className="text-red-400 text-xs mb-4">{error}</div>}

      {traceState && traceState.length > 0 && !loading && (
        <div className="trace-viewport animate-fade-in">
          <div className="step-controls flex justify-between items-center mb-4 bg-gray-800 p-2 rounded">
            <button onClick={handlePrev} disabled={currentStepIndex === 0} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs disabled:opacity-50 transition-colors">← Prev</button>
            <span className="text-xs text-gray-400 font-mono">Step {currentStepIndex + 1} of {traceState.length}</span>
            <button onClick={handleNext} disabled={currentStepIndex === traceState.length - 1} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs disabled:opacity-50 transition-colors">Next →</button>
          </div>

          <div className="mt-4 pointer-state">
            <h4 className="text-xs font-semibold mb-2 text-purple-400 font-sans tracking-wide">Current Action (Line {traceState[currentStepIndex]?.line || '?'})</h4>
            <div className="p-3 bg-gray-800 rounded font-sans text-sm leading-relaxed border border-gray-700 shadow-inner">
              {traceState[currentStepIndex]?.explanation || 'No explanation provided.'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="variables-pane">
              <h4 className="text-xs font-semibold mb-2 text-green-400 font-sans tracking-wide">Local Variables</h4>
              <div className="bg-gray-800 p-3 rounded font-mono text-xs border border-gray-700 h-32 overflow-y-auto shadow-inner">
                {Object.entries(traceState[currentStepIndex]?.variables || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-gray-700/50 pb-1 mb-1">
                    <span className="text-gray-400">{key}:</span>
                    <span className="text-yellow-300">{JSON.stringify(value)}</span>
                  </div>
                ))}
                {Object.keys(traceState[currentStepIndex]?.variables || {}).length === 0 && <span className="text-gray-500 italic">No variables traced.</span>}
              </div>
            </div>

            <div className="memory-pane">
              <h4 className="text-xs font-semibold mb-2 text-red-400 font-sans tracking-wide">Heap / Stack Memory</h4>
              <div className="bg-gray-800 p-3 rounded font-mono text-xs border border-gray-700 h-32 overflow-y-auto shadow-inner">
                <span className="text-gray-300 pointer-events-none">{traceState[currentStepIndex]?.memory || 'Clean'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!traceState && !loading && !error && (
        <div className="text-center py-6 text-gray-500 text-xs italic">
          Write code and click Generate Trace to visualize the execution pointers and memory states step-by-step.
        </div>
      )}
    </div>
  );
}
