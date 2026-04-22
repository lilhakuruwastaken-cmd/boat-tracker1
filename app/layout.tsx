import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Boat Tracker',
  description: 'Real-time boat tracking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}