'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { recommendationService } from '@/services/recommendation.service';
import {
  Sparkles,
  Clock,
  BookOpen,
  ChevronRight,
  BookmarkPlus,
  MapPin,
} from 'lucide-react';
import SkillRadarChart from '@/components/recommendation/SkillRadarChart';

export default function RecommendationResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      recommendationService
        .getResult(id as string)
        .then((res) => setData(res))
        .catch(() => alert('โหลดข้อมูลไม่สำเร็จ'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleSaveCourse = async (courseId: string) => {
    try {
      setSavingId(courseId);

      // สมมติเรียกใช้ fetch แบบที่เราทำใน service หน้าอื่นๆ
      // (คุณสามารถนำไปใส่ใน recommendationService ได้เช่นกัน)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/recommendation/${id}/save-course`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}` // ถ้ามี token แนบไปด้วย
          },
          body: JSON.stringify({ courseId }),
        },
      );

      if (!res.ok) throw new Error('Failed to save');
      alert('บันทึกคอร์สลงรายการที่สนใจสำเร็จ! 💖');
    } catch (error) {
      alert('ไม่สามารถบันทึกคอร์สได้ หรือคุณอาจยังไม่ได้เข้าสู่ระบบครับ');
    } finally {
      setSavingId(null);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-brand-purple">
        <Sparkles className="animate-pulse" size={40} />
      </div>
    );
  if (!data) return null;

  // Mock Data สำหรับ Radar Chart เปรียบเทียบ
  const chartData = [
    { subject: 'AI Tools', current: 30, target: 90, fullMark: 100 },
    { subject: 'Data Analysis', current: 50, target: 85, fullMark: 100 },
    { subject: 'Marketing', current: 80, target: 95, fullMark: 100 },
    { subject: 'Programming', current: 20, target: 60, fullMark: 100 },
    { subject: 'Design', current: 40, target: 70, fullMark: 100 },
  ];

  return (
    <div className="min-h-screen bg-[#fafafc] dark:bg-slate-950 pb-20">
      {/* Hero Result */}
      <div className="bg-gradient-to-br from-brand-purple/90 to-brand-pink/90 pt-24 pb-32 px-4 text-center text-white relative">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-bold mb-6">
            <Sparkles size={16} /> วิเคราะห์เสร็จสมบูรณ์
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            เส้นทางการเรียนรู้ที่ใช่สำหรับคุณ
          </h1>
          <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] text-left">
            <p className="text-lg leading-relaxed text-white/90">
              {data.aiSummary}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-16 space-y-10 relative z-20">
        {/* Top 5 Recommended Courses */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="text-brand-pink" /> 5 คอร์สที่ AI แนะนำสูงสุด
          </h2>

          <div className="grid gap-6">
            {data.recommendations.map((rec: any, idx: number) => {
              const course = rec.course;
              const isTopMatch = rec.score >= 85;

              return (
                <div
                  key={rec.id}
                  className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row gap-6 items-center"
                >
                  {/* Image */}
                  <div className="w-full md:w-64 h-48 rounded-2xl overflow-hidden shrink-0 relative">
                    <img
                      src={course.coverImage}
                      alt={course.courseName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    {isTopMatch && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                        ⭐ เหมาะกับคุณมาก
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold text-brand-purple bg-brand-purple/10 px-3 py-1 rounded-full">
                        {course.categoryRecord?.name?.th || course.category}
                      </span>
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-2xl font-black ${isTopMatch ? 'text-emerald-500' : 'text-brand-yellow'}`}
                        >
                          {rec.score}%
                        </span>
                        <span className="text-xs text-slate-400">
                          Match Score
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-brand-purple transition-colors">
                      {course.courseName}
                    </h3>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={16} /> {course.duration || '4h 30m'}
                      </span>
                      <span className="flex items-center gap-1">
                        ฿{Number(course.price).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 px-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                        {course.level}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-sm text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                      <strong className="text-brand-pink">
                        💡 เหตุผลที่แนะนำ:
                      </strong>{' '}
                      {rec.reason}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full md:w-auto flex flex-col gap-3 shrink-0">
                    <button
                      onClick={() => router.push(`/courses/${course.slug}`)}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-brand-purple text-white rounded-full font-bold hover:opacity-90 transition"
                    >
                      ดูรายละเอียด <ChevronRight size={18} />
                    </button>
                    <button
                      onClick={() => handleSaveCourse(course.id)}
                      disabled={savingId === course.id}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-pink rounded-full font-bold transition disabled:opacity-50"
                    >
                      <BookmarkPlus size={18} />{' '}
                      {savingId === course.id ? 'กำลังบันทึก...' : 'บันทึกไว้'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Radar Chart & Career */}
        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
              ทักษะที่คุณควรพัฒนา (Skills Gap)
            </h3>
            <SkillRadarChart data={chartData} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <MapPin className="text-brand-yellow" /> อาชีพที่แนะนำสำหรับคุณ
            </h3>
            <div className="space-y-4">
              {[
                'AI Content Creator',
                'Prompt Engineer',
                'Digital Marketer with AI',
              ].map((career, i) => (
                <div
                  key={i}
                  className="p-4 border-2 border-brand-purple/10 hover:border-brand-purple/30 rounded-2xl transition cursor-pointer flex items-center justify-between"
                >
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {career}
                  </span>
                  <ChevronRight className="text-brand-purple" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
