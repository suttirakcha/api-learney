'use client';

import { useState, useEffect } from 'react';
import { fetchApi, fetchWithZustandAuth } from '@/lib/api/apiClient';
import {
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminQuestionsPage() {
  const [stages, setStages] = useState<any[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ดึงข้อมูลช่วงวัยทั้งหมดเมื่อเข้าสู่หน้าแรก
  useEffect(() => {
    fetchApi('/assessment/stages')
      .then((res) => {
        setStages(res);
        if (res.length > 0) {
          setSelectedStage(res[0].slug);
        }
      })
      .catch(() => toast.error('โหลดข้อมูลช่วงวัยไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  // ดึงคำถามเมื่อสลับแท็บช่วงวัย
  useEffect(() => {
    if (!selectedStage) return;
    setLoading(true);
    fetchApi(`/assessment/questions?stage=${selectedStage}`)
      .then((res) => setQuestions(res))
      .catch(() => toast.error('โหลดข้อมูลคำถามไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [selectedStage]);

  // ฟังก์ชันลบคำถาม
  const handleDelete = async (id: string) => {
    if (!confirm('คุณต้องการลบคำถามนี้ใช่หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้'))
      return;

    try {
      await fetchWithZustandAuth(`/admin/assessment/questions/${id}`, {
        method: 'DELETE',
      });
      toast.success('ลบคำถามสำเร็จ');
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      toast.error('ไม่สามารถลบคำถามได้ โปรดลองอีกครั้ง');
    }
  };

  // ค้นหาตามข้อความหรือมิติ
  const filteredQuestions = questions.filter(
    (q) =>
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.traitDimension &&
        q.traitDimension.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  if (loading && stages.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-purple" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
            จัดการแบบประเมินและคำถาม
          </h1>
          <p className="text-slate-500 mt-1">
            เพิ่ม แก้ไข และลบคำถาม (Career Discovery) แยกตามแต่ละช่วงวัย
          </p>
        </div>
        <Button className="bg-brand-purple hover:bg-brand-purple/90 text-white shadow-md rounded-full transition-transform active:scale-95">
          <Plus size={18} className="mr-2" /> เพิ่มคำถามใหม่
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {stages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.slug)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedStage === stage.slug
                  ? 'bg-brand-purple text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {stage.titleTh}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <Input
            placeholder="ค้นหาคำถาม หรือหมวดหมู่..."
            className="pl-10 h-11 rounded-full border-slate-200 dark:border-slate-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="p-32 flex justify-center">
            <Loader2 className="animate-spin text-brand-purple" size={40} />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-500">
            <AlertCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-medium">ไม่พบคำถามในหมวดหมู่นี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-slate-500 dark:text-slate-400 text-sm">
                  <th className="px-6 py-4 font-medium w-16">ลำดับ</th>
                  <th className="px-6 py-4 font-medium">เนื้อหาคำถาม</th>
                  <th className="px-6 py-4 font-medium w-48">
                    มิติ (Dimension)
                  </th>
                  <th className="px-6 py-4 font-medium w-32">ประเภท</th>
                  <th className="px-6 py-4 font-medium w-32 text-right">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQuestions.map((q, idx) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {q.questionText}
                      </div>
                      {q.helperText && (
                        <div className="text-xs text-slate-500 mt-1">
                          {q.helperText}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-brand-purple/10 text-brand-purple text-xs font-bold rounded-md uppercase tracking-wider">
                        {q.traitDimension || q.traitCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {q.type}{' '}
                      {q.reverseScore && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full font-bold">
                          Reverse
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="p-2 text-slate-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-lg transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
