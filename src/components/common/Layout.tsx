import React from 'react';
import { Navigation } from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Security Alert Banner */}
      <div className="bg-red-50 border-b border-red-200 px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-red-800">
            <span className="font-semibold">Detected SQL injection attempts:</span> SQL injection attempts have been detected and blocked. All attacks have been successfully blocked by the security system. We are a educational platform and we do not store any sensitive data.
          </p>
        </div>
      </div>
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
              Traced by Opik
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

