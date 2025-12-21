'use client';

import { useAppStore } from '@/lib/store';
import { STEPS } from '@/lib/constants';
import { StepIndicator } from '@/components/step-indicator';
import { StepApiSetup } from '@/components/steps/step-api-setup';
import { StepBusinessInfo } from '@/components/steps/step-business-info';
import { StepImageUpload } from '@/components/steps/step-image-upload';
import { StepGenerate } from '@/components/steps/step-generate';
import { StepResult } from '@/components/steps/step-result';

export default function Home() {
  const { currentStep } = useAppStore();

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

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Hero Section */}
      <section className="text-center mb-10 pt-4">
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
        <StepIndicator steps={STEPS} currentStep={currentStep} />
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
