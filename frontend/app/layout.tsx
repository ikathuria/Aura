import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Windy City Whispers',
  description: 'A location-based discovery app that unlocks cinematic stories at iconic landmarks.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
