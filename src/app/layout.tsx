import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import AppNav from '@/app/components/AppNav';
import BackToTopButton from '@/app/components/BackToTopButton';

export const metadata: Metadata = {
  title: {
    default: 'Competitor AI Visibility Gap Tool',
    template: '%s | Competitor AI Visibility Gap Tool'
  },
  description: 'Track brand mentions across AI answers and find visibility gaps.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="app-layout">
          <header>
            <AppNav />
          </header>
          <main id="main-content">{children}</main>
        </div>
        <BackToTopButton />
      </body>
    </html>
  );
}
