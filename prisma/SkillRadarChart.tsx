'use client';

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface SkillData {
  subject: string;
  current: number;
  target: number;
  fullMark: number;
}

export default function SkillRadarChart({ data }: { data: SkillData[] }) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
          <p className="font-bold text-slate-800 dark:text-white mb-2">
            {payload[0].payload.subject}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600 dark:text-slate-300">
                {entry.name === 'current'
                  ? 'ทักษะปัจจุบัน:'
                  : 'เป้าหมายที่ควรพัฒนา:'}
              </span>
              <span className="font-bold" style={{ color: entry.color }}>
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="current"
            dataKey="current"
            stroke="#cbd5e1"
            fill="#cbd5e1"
            fillOpacity={0.4}
          />
          <Radar
            name="target"
            dataKey="target"
            stroke="#bda9ff"
            fill="#bda9ff"
            fillOpacity={0.6}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
