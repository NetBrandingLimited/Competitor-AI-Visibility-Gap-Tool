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
        <main style={{ maxWidth: 960, margin: '40px auto', padding: '0 16px' }}>
          <AppNav />
          {children}
        </main>
        <BackToTopButton />
      </body>
    </html>
  );
}
