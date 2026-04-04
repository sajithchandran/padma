'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
