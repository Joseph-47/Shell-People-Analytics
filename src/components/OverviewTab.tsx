import React, { useMemo } from 'react';
import { ScoredEmployee } from '../types/employee';
import {
  computeHiringTrend,
  computeOverviewKpis,
  groupBreakdown,
} from '../utils/analytics';
import { ChartCard } from './ChartCard';
import { KpiStrip } from './KpiStrip';

interface OverviewTabProps {
  employees: ScoredEmployee[];
  isDark: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ employees, isDark }) => {
  const kpis = useMemo(() => computeOverviewKpis(employees), [employees]);
  const byDept = useMemo(() => groupBreakdown(employees, (e) => e.department), [employees]);
  const byLocation = useMemo(() => groupBreakdown(employees, (e) => e.location), [employees]);
  const byGender = useMemo(() => groupBreakdown(employees, (e) => e.gender), [employees]);
  const byEmploymentType = useMemo(
    () => groupBreakdown(employees, (e) => e.employmentType),
    [employees]
  );
  const hiringTrend = useMemo(() => computeHiringTrend(employees), [employees]);

  const isEmpty = employees.length === 0;

  return (
    <div className="space-y-6">
      <KpiStrip metrics={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Department Headcount & Attrition */}
        <ChartCard
          title="Headcount by Department"
          subtitle="Active staff vs. attrited departures across UK functions"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-80"
          deps={[byDept]}
          buildConfig={(theme) => ({
            type: 'bar',
            data: {
              labels: byDept.map((d) => d.label),
              datasets: [
                {
                  label: 'Active',
                  data: byDept.map((d) => d.active),
                  backgroundColor: '#FFC800',
                  borderRadius: 3,
                },
                {
                  label: 'Attrited',
                  data: byDept.map((d) => d.attrited),
                  backgroundColor: '#F58220',
                  borderRadius: 3,
                },
              ],
            },
            options: {
              indexAxis: 'y',
              scales: {
                x: {
                  stacked: true,
                  grid: { color: theme.grid },
                  ticks: { color: theme.mutedText, precision: 0 },
                },
                y: {
                  stacked: true,
                  grid: { display: false },
                  ticks: { color: theme.text, font: { size: 11 } },
                },
              },
              plugins: {
                legend: { position: 'top', align: 'end' },
                tooltip: {
                  callbacks: {
                    afterBody: (items) => {
                      const idx = items[0]?.dataIndex;
                      if (idx === undefined) return '';
                      const row = byDept[idx];
                      return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`;
                    },
                  },
                },
              },
            },
          })}
        />

        {/* 2. Location Headcount & Attrition */}
        <ChartCard
          title="Headcount by UK Location"
          subtitle="Regional site distribution and turnover split"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-80"
          deps={[byLocation]}
          buildConfig={(theme) => ({
            type: 'bar',
            data: {
              labels: byLocation.map((l) => l.label),
              datasets: [
                {
                  label: 'Active',
                  data: byLocation.map((l) => l.active),
                  backgroundColor: isDark ? '#E5E5E5' : '#171717',
                  borderRadius: 3,
                },
                {
                  label: 'Attrited',
                  data: byLocation.map((l) => l.attrited),
                  backgroundColor: '#F58220',
                  borderRadius: 3,
                },
              ],
            },
            options: {
              scales: {
                x: {
                  stacked: true,
                  grid: { display: false },
                  ticks: { color: theme.text, font: { size: 11 } },
                },
                y: {
                  stacked: true,
                  grid: { color: theme.grid },
                  ticks: { color: theme.mutedText, precision: 0 },
                },
              },
              plugins: {
                legend: { position: 'top', align: 'end' },
                tooltip: {
                  callbacks: {
                    afterBody: (items) => {
                      const idx = items[0]?.dataIndex;
                      if (idx === undefined) return '';
                      const row = byLocation[idx];
                      return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`;
                    },
                  },
                },
              },
            },
          })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 3. Gender Distribution */}
        <ChartCard
          title="Gender Composition"
          subtitle="Workforce share across filtered selection"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-64"
          deps={[byGender]}
          buildConfig={() => {
            const palette = ['#FFC800', isDark ? '#E5E5E5' : '#171717', '#F58220'];
            return {
              type: 'doughnut',
              data: {
                labels: byGender.map((g) => g.label),
                datasets: [
                  {
                    data: byGender.map((g) => g.total),
                    backgroundColor: byGender.map((_, i) => palette[i % palette.length]),
                    borderColor: isDark ? '#141416' : '#FFFFFF',
                    borderWidth: 2,
                  },
                ],
              },
              options: {
                cutout: '64%',
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const row = byGender[ctx.dataIndex];
                        const share =
                          employees.length > 0 ? ((row.total / employees.length) * 100).toFixed(1) : '0.0';
                        return ` ${row.label}: ${row.total} (${share}%) · Attrition ${row.attritionRate.toFixed(1)}%`;
                      },
                    },
                  },
                },
              },
            };
          }}
        />

        {/* 4. Employment Type */}
        <ChartCard
          title="Employment Type"
          subtitle="Full-Time, Part-Time, and Contract mix"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-64"
          deps={[byEmploymentType]}
          buildConfig={(theme) => ({
            type: 'bar',
            data: {
              labels: byEmploymentType.map((t) => t.label),
              datasets: [
                {
                  label: 'Active',
                  data: byEmploymentType.map((t) => t.active),
                  backgroundColor: '#FFC800',
                  borderRadius: 4,
                },
                {
                  label: 'Attrited',
                  data: byEmploymentType.map((t) => t.attrited),
                  backgroundColor: '#F58220',
                  borderRadius: 4,
                },
              ],
            },
            options: {
              scales: {
                x: {
                  stacked: true,
                  grid: { display: false },
                  ticks: { color: theme.text },
                },
                y: {
                  stacked: true,
                  grid: { color: theme.grid },
                  ticks: { color: theme.mutedText, precision: 0 },
                },
              },
              plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                  callbacks: {
                    afterBody: (items) => {
                      const idx = items[0]?.dataIndex;
                      if (idx === undefined) return '';
                      const row = byEmploymentType[idx];
                      return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`;
                    },
                  },
                },
              },
            },
          })}
        />

        {/* 5. Hiring Trend */}
        <ChartCard
          title="Hiring Trend by Year"
          subtitle="Annual intake trajectory from HireDate"
          isDark={isDark}
          isEmpty={isEmpty || hiringTrend.length === 0}
          heightClass="h-64"
          deps={[hiringTrend]}
          buildConfig={(theme) => ({
            type: 'line',
            data: {
              labels: hiringTrend.map((p) => p.year),
              datasets: [
                {
                  label: 'Hires',
                  data: hiringTrend.map((p) => p.hires),
                  borderColor: '#F58220',
                  backgroundColor: isDark ? 'rgba(255, 200, 0, 0.14)' : 'rgba(255, 200, 0, 0.24)',
                  pointBackgroundColor: '#FFC800',
                  pointBorderColor: isDark ? '#141416' : '#171717',
                  pointBorderWidth: 1.5,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  borderWidth: 2.2,
                  tension: 0.25,
                  fill: true,
                },
              ],
            },
            options: {
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { color: theme.mutedText, maxTicksLimit: 8, font: { size: 11 } },
                },
                y: {
                  beginAtZero: true,
                  grid: { color: theme.grid },
                  ticks: { color: theme.mutedText, precision: 0 },
                },
              },
              plugins: {
                legend: { display: false },
              },
            },
          })}
        />
      </div>
    </div>
  );
};
