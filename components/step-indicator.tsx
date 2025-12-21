'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 flex-wrap">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                  index < currentStep
                    ? 'bg-[#111111] text-white'
                    : index === currentStep
                    ? 'bg-[#f72c5b] text-white'
                    : 'bg-[#f5f5f5] text-[#6b7280] border border-[#eeeeee]'
                )}
              >
                {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
              </div>
            </div>
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                index === currentStep
                  ? 'text-[#f72c5b]'
                  : index < currentStep
                  ? 'text-[#111111]'
                  : 'text-[#6b7280]'
              )}
            >
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 md:w-16 h-0.5 mx-2 rounded-full transition-all duration-500',
                index < currentStep
                  ? 'bg-[#111111]'
                  : 'bg-[#eeeeee]'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
