'use client';

import React from 'react';
import {
  Trophy,
  Sparkles,
  TrendingUp,
  AlertCircle,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export interface AiAnalysisData {
  score: number;
  maxScore: number;
  learnerLevel: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  aiSummary: string;
  strengths: string[];
  weaknesses: string[];
  recommendedPath: { title: string; reason: string }[];
}

interface AssessmentResultProps {
  data: AiAnalysisData;
  onContinue: () => void;
}

export default function AssessmentResult({
  data,
  onContinue,
}: AssessmentResultProps) {
  const percentage = Math.round((data.score / data.maxScore) * 100);

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Header & Score Section */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 sm:p-12 shadow-sm border border-slate-100 dark:border-slate-700 text-center relative overflow-hidden">
        {/* Background Decorative Blob */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-yellow/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-brand-yellow/20 rounded-full flex items-center justify-center mb-6 text-brand-yellow">
            <Trophy size={40} strokeWidth={1.5} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white mb-2">
            ทำแบบทดสอบสำเร็จ!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">
            นี่คือผลการวิเคราะห์ทักษะของคุณเพื่อวางแผนการเรียนที่เหมาะสมที่สุด
          </p>

          <div className="flex flex-wrap justify-center gap-6 items-center">
            <div className="text-center px-8 py-4 bg-slate-50 dark:bg-slate-700/50 rounded-3xl border border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">
                คะแนนของคุณ
              </p>
              <div className="text-5xl font-black text-brand-purple">
                {data.score}{' '}
                <span className="text-2xl text-slate-400">
                  / {data.maxScore}
                </span>
              </div>
            </div>

            <div className="text-center px-8 py-4 bg-brand-purple/5 rounded-3xl border border-brand-purple/10">
              <p className="text-sm text-brand-purple/70 font-medium mb-1">
                ระดับผู้เรียน
              </p>
              <div className="text-3xl font-black text-brand-purple flex items-center gap-2">
                <Sparkles size={24} /> {data.learnerLevel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AI Summary Section */}
      <div className="bg-gradient-to-br from-brand-purple/10 via-brand-pink/5 to-white dark:from-brand-purple/20 dark:to-slate-800 rounded-[2rem] p-8 border border-brand-purple/20 relative">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm shrink-0">
            <span className="text-3xl">🤖</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              AI Assistant วิเคราะห์ว่า...
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
              {data.aiSummary}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="flex items-center gap-3 text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-6">
            <TrendingUp size={24} /> จุดแข็งที่คุณทำได้ดี
          </h3>
          <ul className="space-y-4">
            {data.strengths.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-slate-600 dark:text-slate-300 text-lg"
              >
                <CheckCircle2
                  size={24}
                  className="text-emerald-500 shrink-0 mt-0.5"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas to Improve */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="flex items-center gap-3 text-xl font-bold text-brand-pink mb-6">
            <AlertCircle size={24} /> จุดที่ยังเติมเต็มได้อีก
          </h3>
          <ul className="space-y-4">
            {data.weaknesses.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-slate-600 dark:text-slate-300 text-lg"
              >
                <div className="w-6 h-6 rounded-full bg-brand-pink/10 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-brand-pink" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. Recommendation & CTA */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="text-brand-purple" size={24} />{' '}
          เส้นทางการเรียนที่แนะนำสำหรับคุณ
        </h3>

        <div className="space-y-4 mb-8">
          {data.recommendedPath.map((path, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-700 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-100 dark:border-slate-600"
            >
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-lg">
                  {path.title}
                </h4>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  {path.reason}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={onContinue}
            className="flex items-center gap-3 px-10 py-4 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-full font-bold text-lg transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-brand-purple/20"
          >
            เริ่มเข้าสู่บทเรียน <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
