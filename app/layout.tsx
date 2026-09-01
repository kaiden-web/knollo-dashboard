import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'NOLO Commerce Pulse',
  description: '놀로 자사몰 제품별 실매출과 광고 효율 대시보드',
  openGraph: {
    title: 'NOLO Commerce Pulse',
    description: '매출과 광고 효율을 한눈에',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'NOLO Commerce Pulse' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NOLO Commerce Pulse',
    description: '매출과 광고 효율을 한눈에',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
