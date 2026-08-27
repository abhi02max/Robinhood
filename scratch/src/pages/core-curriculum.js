import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import CurriculumView from '../components/CurriculumView';
import massiveCurriculum from '../../massive-curriculum.json';

export default function CoreCurriculumPage() {
  // In a real app, you might fetch this from the API via `getServerSideProps` or `useEffect`.
  // Since we pre-generated the massive 1800+ JSON payload, we'll import it directly for the demo.
  const [data, setData] = useState(null);
  const [solvedProblems, setSolvedProblems] = useState([]);

  useEffect(() => {
    // Simulated load to show it mounts cleanly
    setData(massiveCurriculum);

    // Fetch user progress
    fetch('/api/learning/progress/solved')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch progress');
        return res.json();
      })
      .then(json => {
        if (json.solved) {
          setSolvedProblems(json.solved);
        }
      })
      .catch(err => console.error('Error loading progress:', err));
  }, []);

  if (!data) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white">Loading Core Curriculum...</div>;

  return (
    <>
      <Head>
        <title>Core DSA Curriculum | Robinhood</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="min-h-screen bg-slate-950">
        <CurriculumView curriculumData={data} initialSolvedProblems={solvedProblems} />
      </main>
    </>
  );
}
