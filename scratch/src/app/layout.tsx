import './globals.css';
import Script from 'next/script';
import type { ReactNode } from 'react';
import AdminDependencyWarningBanner from './components/AdminDependencyWarningBanner';

export const metadata = {
  title: 'Robinhood for Good — DSA Learning & Interview Prep Platform',
  description: 'Master DSA with 465+ curated problems, 86+ company prep guides, and AI-powered mentoring. The free, beautiful way to crack any tech interview.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* Lucide Icons - must load before page content renders */}
        <Script
          src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"
          strategy="beforeInteractive"
        />
        {/* Chart.js for dashboard charts */}
        <Script
          src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
          strategy="beforeInteractive"
        />
        <AdminDependencyWarningBanner />
        {children}
      </body>
    </html>
  );
}

