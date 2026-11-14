import React from 'react';
import { KpiMetric } from '../types/employee';

interface KpiStripProps {
  metrics: KpiMetric[];
}

export const KpiStrip: React.FC<KpiStripProps> = ({ metrics }) => {
  const toneValueClass = (tone?: KpiMetric['tone']) => {
    switch (tone) {
      case 'danger':
        return 'text-[#DC2626] dark:text-[#F87171]';
      case 'warning':
        return 'text-[#C25E00] dark:text-[#F58220]';
      case 'success':
        return 'text-[#15803D] dark:text-[#4ADE80]';
      default:
        return 'text-neutral-950 dark:text-neutral-50';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {metrics.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-4 sm:p-5 flex flex-col justify-between"
        >
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {kpi.label}
          </span>
          <div className={`mt-2 text-2xl sm:text-[26px] font-bold tracking-tight font-mono-num ${toneValueClass(kpi.tone)}`}>
            {kpi.value}
          </div>
          <span className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono-num">
            {kpi.sublabel}
          </span>
        </div>
      ))}
    </div>
  );
};
