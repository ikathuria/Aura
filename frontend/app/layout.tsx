import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aura',
  description: 'Global City Exploration with AI Personas'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
