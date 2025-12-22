import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth-context';
import { Header } from '@/components/header';

const notoSansKR = Noto_Sans_KR({
  variable: '--font-noto-sans-kr',
  subsets: ['latin'],
  weight: ['100', '400', '700', '900'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://trainermilestone-blogbooster.vercel.app'),
  title: {
    default: 'BlogBooster - 피트니스 블로그 자동화 시스템',
    template: '%s | BlogBooster',
  },
  description: 'AI 기반 SEO 최적화 블로그 자동 생성. 헬스장, PT샵, 필라테스, 요가 등 피트니스 업종 전문 블로그 콘텐츠를 AI가 자동으로 생성합니다.',
  keywords: [
    '블로그 자동화',
    '피트니스 블로그',
    '헬스장 마케팅',
    'PT샵 블로그',
    '필라테스 마케팅',
    '요가 블로그',
    '네이버 블로그 SEO',
    'AI 블로그 작성',
    'SEO 최적화',
    '블로그 콘텐츠 생성',
    '피트니스 마케팅',
    '헬스장 홍보',
  ],
  authors: [{ name: 'BlogBooster', url: 'https://trainermilestone-blogbooster.vercel.app' }],
  creator: 'BlogBooster',
  publisher: 'BlogBooster',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://trainermilestone-blogbooster.vercel.app',
    siteName: 'BlogBooster',
    title: 'BlogBooster - 피트니스 블로그 자동화 시스템',
    description: 'AI 기반 SEO 최적화 블로그 자동 생성. 헬스장, PT샵, 필라테스 등 피트니스 업종 전문 블로그 콘텐츠를 AI가 자동으로 생성합니다.',
    images: [
      {
        url: '/제목을 입력해주세요. (15).png',
        width: 1200,
        height: 630,
        alt: 'BlogBooster - 피트니스 블로그 자동화',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlogBooster - 피트니스 블로그 자동화 시스템',
    description: 'AI 기반 SEO 최적화 블로그 자동 생성',
    images: ['/제목을 입력해주세요. (15).png'],
    creator: '@blogbooster',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://trainermilestone-blogbooster.vercel.app',
  },
  category: 'technology',
  verification: {
    google: 'google-site-verification-code',
    other: {
      'naver-site-verification': 'naver-site-verification-code',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKR.variable} antialiased min-h-screen bg-white`}>
        <AuthProvider>
          <Header />
          {children}
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
