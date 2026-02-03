import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth-context';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

const notoSansKR = Noto_Sans_KR({
  variable: '--font-noto-sans-kr',
  subsets: ['latin'],
  weight: ['100', '400', '700', '900'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://trainermilestone-blogbooster.vercel.app'),
  title: {
    default: '트레이너 마일스톤 블로그 부스터 - 피트니스 블로그 자동화 시스템',
    template: '%s | 트레이너 마일스톤 블로그 부스터',
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
    '황금키워드',
    '키워드 추출기',
  ],
  authors: [{ name: '트레이너 마일스톤 블로그 부스터', url: 'https://trainermilestone-blogbooster.vercel.app' }],
  creator: '트레이너 마일스톤 블로그 부스터',
  publisher: '트레이너 마일스톤 블로그 부스터',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://trainermilestone-blogbooster.vercel.app',
    siteName: '트레이너 마일스톤 블로그 부스터',
    title: '트레이너 마일스톤 블로그 부스터 - 피트니스 블로그 자동화 시스템',
    description: 'AI 기반 SEO 최적화 블로그 자동 생성. 헬스장, PT샵, 필라테스 등 피트니스 업종 전문 블로그 콘텐츠를 AI가 자동으로 생성합니다.',
    images: [
      {
        url: '/3.png',
        width: 1200,
        height: 630,
        alt: '트레이너 마일스톤 블로그 부스터 - 피트니스 블로그 자동화',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '트레이너 마일스톤 블로그 부스터 - 피트니스 블로그 자동화 시스템',
    description: 'AI 기반 SEO 최적화 블로그 자동 생성',
    images: ['/3.png'],
    creator: '@trainermilestone',
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
    google: 'ULrbCZA1O6k1gKttO1b84SmVd_rFYYgGdWa0cPbZAIg',
    other: {
      'naver-site-verification': '7ac5ded04f31e967be7aa7b6ac67c1f75fa58645',
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
      <head>
        <meta name="naver-site-verification" content="7ac5ded04f31e967be7aa7b6ac67c1f75fa58645" />
      </head>
      <body className={`${notoSansKR.variable} antialiased min-h-screen bg-white flex flex-col`}>
        <AuthProvider>
          <Header />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
