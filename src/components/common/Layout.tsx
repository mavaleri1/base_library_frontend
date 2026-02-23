import React from 'react';
import { Navigation } from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted">
          <p>© 2026 Base Library</p>
          <p className="mt-1">
            <a
              href="https://www.comet.com/opik"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Traced by Comet - Opik
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

