'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';
import { STEPS } from '@/lib/constants';
import { StepIndicator } from '@/components/step-indicator';
import { StepApiSetup } from '@/components/steps/step-api-setup';
import { StepBusinessInfo } from '@/components/steps/step-business-info';
import { StepImageUpload } from '@/components/steps/step-image-upload';
import { StepGenerate } from '@/components/steps/step-generate';
import { StepResult } from '@/components/steps/step-result';
import Image from 'next/image';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { currentStep, setCurrentStep, hydrate } = useAppStore();

  // 클라이언트에서 저장된 API 키 로드
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepApiSetup />;
      case 1:
        return <StepBusinessInfo />;
      case 2:
        return <StepImageUpload />;
      case 3:
        return <StepGenerate />;
      case 4:
        return <StepResult />;
      default:
        return <StepApiSetup />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f72c5b]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Hero Section */}
      <section className="text-center mb-10 pt-4">
        <div className="flex justify-center mb-4">
          <Link href="/" className="cursor-pointer hover:scale-105 transition-transform">
            <Image
              src="/제목을 입력해주세요. (16).png"
              alt="BlogBooster"
              width={240}
              height={68}
              className="h-16 md:h-18 w-auto object-contain"
            />
          </Link>
        </div>
        <p className="text-[#f72c5b] text-sm font-medium tracking-wider mb-3">
          AI BLOG AUTOMATION
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-[#111111] tracking-tight mb-3">
          피트니스 블로그
          <span className="gradient-text ml-2">자동화</span>
        </h1>
        <p className="text-[#6b7280] text-sm">
          AI 기반 블로그 콘텐츠 자동 생성
        </p>
      </section>

      {/* Step Indicator */}
      <div className="mb-10">
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={(stepIndex) => setCurrentStep(stepIndex)}
        />
      </div>

      {/* Step Content */}
      <div className="relative">
        {renderStep()}
      </div>

      {/* Footer */}
      <footer className="text-center mt-16 pt-8 border-t border-[#eeeeee]">
        <p className="text-sm text-[#6b7280]">
          블로그 자동화 시스템
        </p>
      </footer>
    </main>
  );
}
