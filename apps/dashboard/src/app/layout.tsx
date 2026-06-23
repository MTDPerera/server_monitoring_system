import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { LayoutShell } from '@/components/LayoutShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Server Monitor',
  description: 'Multi-Network Monitoring Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preload YouTube IFrame API so video starts as soon as possible */}
        <Script src="https://www.youtube.com/iframe_api" strategy="beforeInteractive" />
      </head>
      <body className={`${inter.className} bg-[#010912] text-white`}>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
