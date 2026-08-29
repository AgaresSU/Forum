import type { Metadata } from 'next';
import { Manrope, PT_Sans } from 'next/font/google';
import './globals.css';

const heading = Manrope({
  variable: '--font-heading-site',
  subsets: ['cyrillic', 'latin'],
});

const body = PT_Sans({
  variable: '--font-body-site',
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('http://127.0.0.1:3000'),
  title: 'Основа — профессиональное IT-сообщество',
  description: 'Закрытый профессиональный форум для разработчиков, инженеров и технических специалистов.',
  openGraph: {
    title: 'Основа — профессиональное IT-сообщество',
    description: 'Закрытый профессиональный форум для разработчиков, инженеров и технических специалистов.',
    images: [{ url: '/og-it.png', width: 1734, height: 907, alt: 'Основа — профессиональное IT-сообщество' }],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Основа — профессиональное IT-сообщество',
    description: 'Закрытый профессиональный форум для разработчиков, инженеров и технических специалистов.',
    images: ['/og-it.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${heading.variable} ${body.variable} antialiased`}>{children}</body>
    </html>
  );
}
