import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Padma — Care Coordination Platform',
  description: 'Clinical pathway and care coordination for chronic disease management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
