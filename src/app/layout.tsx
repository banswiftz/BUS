import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Swiftie Lyric Guesser',
  description: 'Guess the Taylor Swift song based on the iconic lyrics!',
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
