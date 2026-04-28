import './globals.css';
import type { ReactNode } from 'react';

import AppNav from '@/app/components/AppNav';
import BackToTopButton from '@/app/components/BackToTopButton';

export const metadata = {
  title: 'Competitor AI Visibility Gap Tool',
  description: 'Track brand mentions across AI answers and find visibility gaps.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <main id="main-content" className="app-main">
          <AppNav />
          {children}
        </main>
        <BackToTopButton />
      </body>
    </html>
  );
}
