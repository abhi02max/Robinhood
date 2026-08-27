import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import ProblemLayout from '../components/ProblemLayout';
import problemData from '../../longest-substring.json';

export default function CoreProblemPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Try API first, fallback to static JSON
    fetch('/api/learning/problems/longest-substring-without-repeating-characters')
      .then(res => {
        if (!res.ok) throw new Error('API unavailable');
        return res.json();
      })
      .then(apiData => setData(apiData))
      .catch(() => {
        // Fallback to bundled JSON data
        setData(problemData);
      });
  }, []);

  if (!data) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#e2e8f0',
        fontFamily: "'Inter', system-ui, sans-serif",
        gap: '1rem',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid #1e293b',
          borderTopColor: '#34d399',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Loading Problem Workspace…</span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{data.title} | Robinhood Problem Workspace</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={`Solve ${data.title} – ${data.difficulty} difficulty. Practice ${data.pattern || 'DSA'} patterns.`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <main style={{ minHeight: '100vh', background: '#0f172a' }}>
        <ProblemLayout problemData={data} />
      </main>
    </>
  );
}
