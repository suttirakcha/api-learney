'use client';

import React, { useState } from 'react';
import {
  Users,
  TrendingUp,
  Star,
  Search,
  Filter,
  MoreVertical,
  Download,
  ChevronRight,
  BrainCircuit,
} from 'lucide-react';

export default function AdminAssessmentDashboard() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock Data สำหรับ Analytics
  const analytics = {
    totalAttempts: 1240,
    avgImprovement: '+34%',
    weakestCategory: 'การประยุกต์ใช้ Logic',
    popularCourse: 'Complete Web Dev Bootcamp',
  };

  // Mock Data สำหรับตารางผลลัพธ์ผู้เรียน
  const mockResults = [
    {
      id: '1',
      learnerName: 'สมชาย เรียนดี',
      course: 'Complete Web Dev Bootcamp',
      testType: 'PRE_TEST',
      score: 4,
      maxScore: 10,
      level: 'Beginner',
      date: '2026-04-19',
    },
    {
      id: '2',
      learnerName: 'มาลี สีสวย',
      course: 'UI/UX Design Masterclass',
      testType: 'POST_TEST',
      score: 9,
      maxScore: 10,
      level: 'Advanced',
      date: '2026-04-18',
    },
    {
      id: '3',
      learnerName: 'วิชัย ใจสู้',
      course: 'Complete Web Dev Bootcamp',
      testType: 'PRE_TEST',
      score: 6,
      maxScore: 10,
      level: 'Intermediate',
      date: '2026-04-18',
    },
    {
      id: '4',
      learnerName: 'นารี มีสุข',
      course: 'Advanced React & Redux',
      testType: 'POST_TEST',
      score: 8,
      maxScore: 10,
      level: 'Advanced',
      date: '2026-04-17',
    },
  ];

  // Helper function สำหรับกำหนดสีของ Level
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'Beginner':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-brand-yellow/20 text-yellow-700 dark:text-yellow-400">
            Beginner
          </span>
        );
      case 'Intermediate':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-brand-purple/20 text-brand-purple">
            Intermediate
          </span>
        );
      case 'Advanced':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-brand-pink/20 text-brand-pink">
            Advanced
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
            {level}
          </span>
        );
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <BrainCircuit className="text-brand-purple" size={32} />
            ภาพรวมระบบแบบประเมิน AI
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            ติดตามผลลัพธ์และพัฒนาการของผู้เรียนทั้งหมด
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full text-slate-700 dark:text-slate-200 font-medium transition-all shadow-sm">
          <Download size={18} />
          Export ข้อมูล
        </button>
      </div>

      {/* 2. Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-brand-purple/10 flex items-center justify-center text-brand-purple rounded-2xl">
              <Users size={24} />
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
              +12% เดือนนี้
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            จำนวนครั้งที่ประเมิน
          </p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
            {analytics.totalAttempts}
          </h3>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center text-emerald-500 rounded-2xl">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            อัตราการพัฒนาเฉลี่ย
          </p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
            {analytics.avgImprovement}
          </h3>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-brand-pink/30 relative overflow-hidden lg:col-span-2">
          <div className="absolute -right-6 -bottom-6 opacity-10 text-brand-pink">
            <Star size={120} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-pink/10 text-brand-pink text-xs font-bold rounded-full mb-3">
              ✨ AI Insight
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
              จุดที่ผู้เรียนส่วนใหญ่อ่อนที่สุด:{' '}
              <span className="text-brand-pink">
                {analytics.weakestCategory}
              </span>
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              ระบบแนะนำให้ผู้สอนเพิ่มเนื้อหาหรือแบบฝึกหัดในหมวดหมู่นี้ในคอร์ส{' '}
              <strong>{analytics.popularCourse}</strong> เพื่อผลลัพธ์ที่ดีขึ้น
            </p>
          </div>
        </div>
      </div>

      {/* 3. Data Table Section */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {/* Table Header & Filters */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            ประวัติผลลัพธ์ล่าสุด
          </h2>

          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้เรียน..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-purple/20 dark:text-white outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-brand-purple rounded-full transition-colors shrink-0">
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">ชื่อผู้เรียน</th>
                <th className="px-6 py-4 font-medium">คอร์สเรียน</th>
                <th className="px-6 py-4 font-medium">ประเภท</th>
                <th className="px-6 py-4 font-medium">คะแนน</th>
                <th className="px-6 py-4 font-medium">ระดับ AI ประเมิน</th>
                <th className="px-6 py-4 font-medium">วันที่</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {mockResults
                .filter(
                  (r) =>
                    r.learnerName.includes(searchTerm) ||
                    r.course.includes(searchTerm),
                )
                .map((result) => (
                  <tr
                    key={result.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-white">
                        {result.learnerName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                        {result.course}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                          result.testType === 'PRE_TEST'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                        }`}
                      >
                        {result.testType === 'PRE_TEST'
                          ? 'Pre-test'
                          : 'Post-test'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white">
                          {result.score}
                        </span>
                        <span className="text-xs text-slate-400">
                          / {result.maxScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getLevelBadge(result.level)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(result.date).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-brand-purple hover:bg-brand-purple/10 rounded-full transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1 text-sm font-medium">
                          ดูรายละเอียด <ChevronRight size={16} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {mockResults.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    ไม่พบข้อมูลที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (Mock) */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-sm text-slate-500">
          <span>แสดง 1-4 จากทั้งหมด 1,240 รายการ</span>
          <div className="flex gap-1">
            <button
              className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              disabled
            >
              ก่อนหน้า
            </button>
            <button className="px-3 py-1 bg-brand-purple text-white rounded-md">
              1
            </button>
            <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
              2
            </button>
            <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
              3
            </button>
            <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
