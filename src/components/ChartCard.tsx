import React, { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface ChartThemeColors {
  text: string;
  mutedText: string;
  grid: string;
  surface: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
  inkBar: string;
}

export function getChartThemeColors(isDark: boolean): ChartThemeColors {
  return isDark
    ? {
        text: '#F5F5F5',
        mutedText: '#A3A3A3',
        grid: 'rgba(255, 255, 255, 0.08)',
        surface: '#141416',
        tooltipBg: '#1C1C1F',
        tooltipText: '#FAFAFA',
        tooltipBorder: '#3F3F46',
        inkBar: '#E5E5E5',
      }
    : {
        text: '#171717',
        mutedText: '#525252',
        grid: 'rgba(0, 0, 0, 0.07)',
        surface: '#FFFFFF',
        tooltipBg: '#171717',
        tooltipText: '#FAFAFA',
        tooltipBorder: '#262626',
        inkBar: '#171717',
      };
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  isDark: boolean;
  isEmpty?: boolean;
  heightClass?: string;
  buildConfig: (theme: ChartThemeColors) => ChartConfiguration;
  deps: unknown[];
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  isDark,
  isEmpty = false,
  heightClass = 'h-72',
  buildConfig,
  deps,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (isEmpty || !canvasRef.current) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const theme = getChartThemeColors(isDark);
    const config = buildConfig(theme);

    // Enforce consistent typography & responsive defaults
    config.options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 220 },
      ...config.options,
      plugins: {
        ...config.options?.plugins,
        legend: {
          ...config.options?.plugins?.legend,
          labels: {
            color: theme.text,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 500 },
            boxWidth: 12,
            boxHeight: 12,
            padding: 14,
            ...config.options?.plugins?.legend?.labels,
          },
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 600 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
          ...config.options?.plugins?.tooltip,
        },
      },
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, isEmpty, ...deps]);

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-5 flex flex-col">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-950 dark:text-neutral-50 tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className={`${heightClass} flex items-center justify-center rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400`}>
          No matching records for this chart under current filters.
        </div>
      ) : (
        <div className={`relative w-full ${heightClass}`}>
          <canvas ref={canvasRef} aria-label={title} role="img" />
        </div>
      )}
    </section>
  );
};
