'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Loader2,
} from 'lucide-react';

export interface Choice {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  prompt: string;
  choices: Choice[];
}

interface AssessmentStepperProps {
  title?: string;
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  isSubmitting?: boolean;
}

export default function AssessmentStepper({
  title = 'แบบประเมินความรู้',
  questions,
  onSubmit,
  isSubmitting = false,
}: AssessmentStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center text-slate-500 py-10">ไม่พบคำถามในระบบ</div>
    );
  }

  const currentQuestion = questions[currentStep];
  const progressPercentage = ((currentStep + 1) / questions.length) * 100;
  const hasAnsweredCurrent = !!answers[currentQuestion.id];
  const isLastStep = currentStep === questions.length - 1;

  const handleSelectChoice = (choiceId: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: choiceId }));
  };

  const handleNext = () => {
    if (!hasAnsweredCurrent) return;
    if (isLastStep) {
      onSubmit(answers);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 md:p-8">
      {/* Header & Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="text-brand-yellow" size={24} />
              {title}
            </h2>
            <p className="text-slate-500 mt-1">
              ข้อที่ {currentStep + 1} จาก {questions.length}
            </p>
          </div>
          <div className="text-brand-purple font-semibold text-lg">
            {Math.round(progressPercentage)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-brand-purple/10 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-brand-purple h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 sm:p-10 shadow-sm border border-slate-100 dark:border-slate-700 mb-8 transition-all">
        <h3 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-8 leading-relaxed">
          {currentQuestion.prompt}
        </h3>

        <div className="space-y-4">
          {currentQuestion.choices.map((choice) => {
            const isSelected = answers[currentQuestion.id] === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => handleSelectChoice(choice.id)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group
                  ${
                    isSelected
                      ? 'border-brand-purple bg-brand-purple/5'
                      : 'border-slate-100 hover:border-brand-pink/50 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50'
                  }
                `}
              >
                <span
                  className={`text-lg ${
                    isSelected
                      ? 'text-brand-purple font-medium'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {choice.text}
                </span>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ml-4
                    ${
                      isSelected
                        ? 'border-brand-purple bg-brand-purple'
                        : 'border-slate-300 group-hover:border-brand-pink'
                    }
                  `}
                >
                  {isSelected && (
                    <Check size={14} className="text-white" strokeWidth={3} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0 || isSubmitting}
          className="flex items-center gap-2 px-6 py-3 rounded-full text-slate-500 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-0 transition-all"
        >
          <ChevronLeft size={20} /> ย้อนกลับ
        </button>

        <button
          onClick={handleNext}
          disabled={!hasAnsweredCurrent || isSubmitting}
          className="flex items-center gap-2 px-8 py-3.5 bg-brand-purple hover:bg-brand-purple/90 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-full font-bold text-lg transition-all transform active:scale-95 shadow-md shadow-brand-purple/20 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} /> กำลังประมวลผล...
            </>
          ) : isLastStep ? (
            <>
              ส่งคำตอบ <Check size={20} />
            </>
          ) : (
            <>
              ข้อถัดไป <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
