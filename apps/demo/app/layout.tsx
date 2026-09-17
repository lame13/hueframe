import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Image → Theme · hueframe',
  description:
    'Drop a photo, watch a working webpage recolour itself, then export the theme as CSS variables or JSON design tokens.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
