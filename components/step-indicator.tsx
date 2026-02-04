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
  onStepClick?: (stepIndex: number) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  const handleStepClick = (index: number) => {
    if (onStepClick) {
      onStepClick(index);
    }
  };

  return (
    <div className="flex items-center justify-center gap-0 flex-wrap">
      {steps.map((step, index) => {
        const isClickable = !!onStepClick;

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex flex-col items-center gap-2",
                isClickable && "cursor-pointer group"
              )}
              onClick={() => handleStepClick(index)}
            >
              <div className="relative">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                    index < currentStep
                      ? 'bg-[#111111] text-white'
                      : index === currentStep
                      ? 'bg-[#f72c5b] text-white'
                      : 'bg-[#f5f5f5] text-[#6b7280] border border-[#eeeeee]',
                    isClickable && 'hover:scale-110 hover:shadow-lg'
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
                    : 'text-[#6b7280]',
                  isClickable && 'group-hover:text-[#f72c5b]'
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
        );
      })}
    </div>
  );
}
