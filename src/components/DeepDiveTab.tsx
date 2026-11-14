import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { ScoredEmployee } from '../types/employee';
import {
  computeDeepDiveKpis,
  formatGbp,
  formatTravelLabel,
  getAgeBand,
  getTenureBand,
  groupBreakdown,
} from '../utils/analytics';
import { ChartCard } from './ChartCard';
import { KpiStrip } from './KpiStrip';

interface DeepDiveTabProps {
  employees: ScoredEmployee[];
  isDark: boolean;
  onSelectEmployee: (emp: ScoredEmployee) => void;
}

type SortKey =
  | 'employeeId'
  | 'fullName'
  | 'department'
  | 'location'
  | 'jobLevel'
  | 'yearsAtCompany'
  | 'monthlyIncomeGbp'
  | 'riskScore'
  | 'attrition';

const AGE_BAND_ORDER = ['Under 25', '25–34', '35–44', '45–54', '55+'];
const TENURE_BAND_ORDER = ['< 2 yrs', '2–4 yrs', '5–9 yrs', '10–14 yrs', '15+ yrs'];
const EDUCATION_ORDER = ['Below College', 'College', "Bachelor's", "Master's", 'Doctorate'];
const TRAVEL_ORDER = ['Non-Travel', 'Travel_Rarely', 'Travel_Frequently'];
const PAGE_SIZE = 15;

export const DeepDiveTab: React.FC<DeepDiveTabProps> = ({
  employees,
  isDark,
  onSelectEmployee,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [employees, searchQuery, sortKey, sortDir]);

  const kpis = useMemo(() => computeDeepDiveKpis(employees), [employees]);

  const ageBands = useMemo(
    () => groupBreakdown(employees, (e) => getAgeBand(e.age), 'customOrder', AGE_BAND_ORDER),
    [employees]
  );

  const tenureBands = useMemo(
    () =>
      groupBreakdown(
        employees,
        (e) => getTenureBand(e.yearsAtCompany),
        'customOrder',
        TENURE_BAND_ORDER
      ),
    [employees]
  );

  const incomeByLevel = useMemo(
    () =>
      groupBreakdown(employees, (e) => `Level ${e.jobLevel}`, 'labelAsc'),
    [employees]
  );

  const incomeByDept = useMemo(() => {
    const groups = groupBreakdown(employees, (e) => e.department);
    return [...groups].sort((a, b) => b.avgIncome - a.avgIncome);
  }, [employees]);

  const byEducation = useMemo(
    () => groupBreakdown(employees, (e) => e.education, 'customOrder', EDUCATION_ORDER),
    [employees]
  );

  const byTravel = useMemo(
    () => groupBreakdown(employees, (e) => e.businessTravel, 'customOrder', TRAVEL_ORDER),
    [employees]
  );

  const scatterActive = useMemo(
    () =>
      employees
        .filter((e) => e.attrition === 'No')
        .map((e) => ({ x: e.yearsAtCompany, y: e.monthlyIncomeGbp, emp: e })),
    [employees]
  );

  const scatterAttrited = useMemo(
    () =>
      employees
        .filter((e) => e.attrition === 'Yes')
        .map((e) => ({ x: e.yearsAtCompany, y: e.monthlyIncomeGbp, emp: e })),
    [employees]
  );

  const searchedAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? employees.filter(
          (e) =>
            e.employeeId.toLowerCase().includes(q) ||
            e.fullName.toLowerCase().includes(q) ||
            e.jobTitle.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q) ||
            e.location.toLowerCase().includes(q)
        )
      : [...employees];

    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'jobLevel':
        case 'yearsAtCompany':
        case 'monthlyIncomeGbp':
        case 'riskScore':
          return (a[sortKey] - b[sortKey]) * dir;
        default:
          return a[sortKey].localeCompare(b[sortKey]) * dir;
      }
    });

    return list;
  }, [employees, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(searchedAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => searchedAndSorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [searchedAndSorted, safePage]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'monthlyIncomeGbp' || key === 'riskScore' || key === 'yearsAtCompany' || key === 'jobLevel'
          ? 'desc'
          : 'asc'
      );
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3 h-3 opacity-40 shrink-0" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#F58220] shrink-0" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#F58220] shrink-0" aria-hidden="true" />
    );
  };

  const isEmpty = employees.length === 0;

  return (
    <div className="space-y-6">
      <KpiStrip metrics={kpis} />

      {/* Age & Tenure Bands with Attrition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Age Bands & Attrition Rate"
          subtitle="Headcount split with attrition rate (%) overlay"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[ageBands]}
          buildConfig={(theme) => ({
            type: 'bar',
            data: {
              labels: ageBands.map((b) => b.label),
              datasets: [
                {
                  type: 'line',
                  label: 'Attrition %',
                  data: ageBands.map((b) => Number(b.attritionRate.toFixed(1))),
                  borderColor: '#DD1D21',
                  backgroundColor: '#DD1D21',
                  borderWidth: 2,
                  pointRadius: 4,
                  yAxisID: 'y1',
                  tension: 0.2,
                },
                {
                  type: 'bar',
                  label: 'Active',
                  data: ageBands.map((b) => b.active),
                  backgroundColor: '#FFC800',
                  borderRadius: 3,
                  stack: 'hc',
                  yAxisID: 'y',
                },
                {
                  type: 'bar',
                  label: 'Attrited',
                  data: ageBands.map((b) => b.attrited),
                  backgroundColor: '#F58220',
                  borderRadius: 3,
                  stack: 'hc',
                  yAxisID: 'y',
                },
              ],
            },
            options: {
              scales: {
                x: { grid: { display: false }, ticks: { color: theme.text } },
                y: {
                  stacked: true,
                  position: 'left',
                  grid: { color: theme.grid },
                  ticks: { color: theme.mutedText, precision: 0 },
                },
                y1: {
                  position: 'right',
                  min: 0,
                  suggestedMax: 50,
                  grid: { drawOnChartArea: false },
                  ticks: {
                    color: '#F58220',
                    callback: (v) => `${v}%`,
                  },
                },
              },
              plugins: { legend: { position: 'top', align: 'end' } },
            },
          })}
        />

        <ChartCard
          title="Tenure Bands & Attrition Rate"
          subtitle="Years at Shell vs. turnover concentration"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[tenureBands]}
          buildConfig={(theme) => ({
            type: 'bar',
            data: {
              labels: tenureBands.map((b) => b.label),
              datasets: [
                {
                  type: 'line',
                  label: 'Attrition %',
                  data: tenureBands.map((b) => Number(b.attritionRate.toFixed(1))),
                  borderColor: '#DD1D21',
                  backgroundColor: '#DD1D21',
                  borderWidth: 2,
                  pointRadius: 4,
                  yAxisID: 'y1',
                  tension: 0.2,
                },
                {
                  type: 'bar',
                  label: 'Active',
                  data: tenureBands.map((b) => b.active),
                  backgroundColor: isDark ? '#E5E5E5' : '#171717',
                  borderRadius: 3,
                  stack: 'hc',
                  yAxisID: 'y',
                },
                {
                  type: 'bar',
                  label: 'Attrited',
                  data: tenureBands.map((b) => b.attrited),
                  backgroundColor: '#F58220',
                  borderRadius: 3,
                  stack: 'hc',
                  yAxisID: 'y',
                },
              ],
            },
            options: {
              scales: {
                x: { grid: { display: false }, ticks: { color: theme.text } },
                y: {
                  stacked: true,
                  position: 'left',
                  grid: { color: theme.grid },
                  ticks: { color: theme.mutedText, precision: 0 },
                },
                y1: {
                  position: 'right',
                  min: 0,
                  suggestedMax: 50,
                  grid: { drawOnChartArea: false },
                  ticks: {
                    color: '#F58220',
                    callback: (v) => `${v}%`,
                  },
                },
              },
              plugins: { legend: { position: 'top', align: 'end' } },
            },
          })}
        />
      </div>

      {/* Income by Level & Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Average Monthly Income by Job Level"
          subtitle="GBP (£) monthly base pay progression across Levels 1–5"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[incomeByLevel]}
          buildConfig={(theme) => ({
            type: 'bar',
            data: {
              labels: incomeByLevel.map((l) => l.label),
              datasets: [
                {
                  label: 'Avg Monthly Income (£)',
                  data: incomeByLevel.map((l) => Math.round(l.avgIncome)),
                  backgroundColor: '#FFC800',
                  borderRadius: 4,
                },
              ],
            },
            options: {
              scales: {
                x: { grid: { display: false }, ticks: { color: theme.text } },
                y: {
                  beginAtZero: true,
                  grid: { color: theme.grid },
                  ticks: {
                    color: theme.mutedText,
                    callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
                  },
                },
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const row = incomeByLevel[ctx.dataIndex];
                      return ` Avg: ${formatGbp(row.avgIncome)}/mo (${row.total} staff)`;
                    },
                  },
                },
              },
            },
          })}
        />

        <ChartCard
          title="Average Monthly Income by Department"
          subtitle="Ranked departmental pay averages in GBP (£)"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[incomeByDept]}
          buildConfig={(theme) => ({
            type: 'bar',
            data: {
              labels: incomeByDept.map((d) => d.label),
              datasets: [
                {
                  label: 'Avg Monthly Income (£)',
                  data: incomeByDept.map((d) => Math.round(d.avgIncome)),
                  backgroundColor: '#F58220',
                  borderRadius: 3,
                },
              ],
            },
            options: {
              indexAxis: 'y',
              scales: {
                x: {
                  beginAtZero: true,
                  grid: { color: theme.grid },
                  ticks: {
                    color: theme.mutedText,
                    callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
                  },
                },
                y: {
                  grid: { display: false },
                  ticks: { color: theme.text, font: { size: 11 } },
                },
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const row = incomeByDept[ctx.dataIndex];
                      return ` Avg: ${formatGbp(row.avgIncome)}/mo (${row.total} staff)`;
                    },
                  },
                },
              },
            },
          })}
        />
      </div>

      {/* Education, Business Travel, Income vs Tenure Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Education & Attrition"
          subtitle="Headcount by highest qualification"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[byEducation]}
          buildConfig={(theme) => ({
            type: 'bar',
            data: {
              labels: byEducation.map((e) => e.label),
              datasets: [
                {
                  label: 'Active',
                  data: byEducation.map((e) => e.active),
                  backgroundColor: '#FFC800',
                  borderRadius: 3,
                },
                {
                  label: 'Attrited',
                  data: byEducation.map((e) => e.attrited),
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
                      const row = byEducation[idx];
                      return `Attrition: ${row.attritionRate.toFixed(1)}%`;
                    },
                  },
                },
              },
            },
          })}
        />

        <ChartCard
          title="Business Travel & Attrition"
          subtitle="Travel intensity vs. turnover rate"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[byTravel]}
          buildConfig={(theme) => ({
            type: 'bar',
            data: {
              labels: byTravel.map((t) => formatTravelLabel(t.label)),
              datasets: [
                {
                  type: 'line',
                  label: 'Attrition %',
                  data: byTravel.map((t) => Number(t.attritionRate.toFixed(1))),
                  borderColor: '#DD1D21',
                  backgroundColor: '#DD1D21',
                  borderWidth: 2,
                  pointRadius: 4,
                  yAxisID: 'y1',
                },
                {
                  type: 'bar',
                  label: 'Active',
                  data: byTravel.map((t) => t.active),
                  backgroundColor: isDark ? '#E5E5E5' : '#171717',
                  borderRadius: 3,
                  stack: 'hc',
                  yAxisID: 'y',
                },
                {
                  type: 'bar',
                  label: 'Attrited',
                  data: byTravel.map((t) => t.attrited),
                  backgroundColor: '#F58220',
                  borderRadius: 3,
                  stack: 'hc',
                  yAxisID: 'y',
                },
              ],
            },
            options: {
              scales: {
                x: { grid: { display: false }, ticks: { color: theme.text, font: { size: 11 } } },
                y: {
                  stacked: true,
                  position: 'left',
                  grid: { color: theme.grid },
                  ticks: { color: theme.mutedText, precision: 0 },
                },
                y1: {
                  position: 'right',
                  min: 0,
                  suggestedMax: 50,
                  grid: { drawOnChartArea: false },
                  ticks: { color: '#F58220', callback: (v) => `${v}%` },
                },
              },
              plugins: { legend: { position: 'top', align: 'end' } },
            },
          })}
        />

        <ChartCard
          title="Income vs. Tenure Scatter"
          subtitle="Years at company vs. monthly GBP pay"
          isDark={isDark}
          isEmpty={isEmpty}
          heightClass="h-72"
          deps={[scatterActive, scatterAttrited]}
          buildConfig={(theme) => ({
            type: 'scatter',
            data: {
              datasets: [
                {
                  label: 'Active',
                  data: scatterActive,
                  backgroundColor: 'rgba(255, 200, 0, 0.78)',
                  borderColor: isDark ? '#FFC800' : '#B45309',
                  borderWidth: 1,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                },
                {
                  label: 'Attrited',
                  data: scatterAttrited,
                  backgroundColor: 'rgba(221, 29, 33, 0.85)',
                  borderColor: '#FFFFFF',
                  borderWidth: 1,
                  pointRadius: 5,
                  pointHoverRadius: 7,
                },
              ],
            },
            options: {
              scales: {
                x: {
                  title: {
                    display: true,
                    text: 'Years at Company',
                    color: theme.mutedText,
                    font: { size: 11 },
                  },
                  grid: { color: theme.grid },
                  ticks: { color: theme.mutedText },
                },
                y: {
                  title: {
                    display: true,
                    text: 'Monthly Income (£)',
                    color: theme.mutedText,
                    font: { size: 11 },
                  },
                  grid: { color: theme.grid },
                  ticks: {
                    color: theme.mutedText,
                    callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
                  },
                },
              },
              plugins: {
                legend: { position: 'top', align: 'end' },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const raw = ctx.raw as { x: number; y: number; emp: ScoredEmployee };
                      return ` ${raw.emp.fullName} (L${raw.emp.jobLevel}): ${formatGbp(raw.y)} · ${raw.x} yrs`;
                    },
                  },
                },
              },
            },
          })}
        />
      </div>

      {/* Searchable, Sortable Employee Table */}
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
              Employee Directory &amp; Risk Ledger
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Click any row to inspect full record and flight-risk score breakdown.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search
              className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, name, title, dept, site…"
              aria-label="Search employees"
              className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#F58220]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#19191C] text-neutral-600 dark:text-neutral-400">
                <th className="py-3 px-4 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('employeeId')}
                    className="inline-flex items-center gap-1.5 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
                  >
                    <span>ID</span>
                    {renderSortIcon('employeeId')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('fullName')}
                    className="inline-flex items-center gap-1.5 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
                  >
                    <span>Employee</span>
                    {renderSortIcon('fullName')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('department')}
                    className="inline-flex items-center gap-1.5 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
                  >
                    <span>Department</span>
                    {renderSortIcon('department')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('location')}
                    className="inline-flex items-center gap-1.5 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
                  >
                    <span>Location</span>
                    {renderSortIcon('location')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('jobLevel')}
                    className="inline-flex items-center justify-end gap-1.5 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
                  >
                    <span>Level</span>
                    {renderSortIcon('jobLevel')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('yearsAtCompany')}
                    className="inline-flex items-center justify-end gap-1.5 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
                  >
                    <span>Tenure</span>
                    {renderSortIcon('yearsAtCompany')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('monthlyIncomeGbp')}
                    className="inline-flex items-center justify-end gap-1.5 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
                  >
                    <span>Income / mo</span>
                    {renderSortIcon('monthlyIncomeGbp')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('riskScore')}
                    className="inline-flex items-center justify-end gap-1.5 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
                  >
                    <span>Flight Risk</span>
                    {renderSortIcon('riskScore')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('attrition')}
                    className="inline-flex items-center gap-1.5 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
                  >
                    <span>Status</span>
                    {renderSortIcon('attrition')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 px-4 text-center text-neutral-500 dark:text-neutral-400"
                  >
                    No employees match your current filter and search criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((emp) => {
                  const riskColor =
                    emp.riskTier === 'High'
                      ? 'text-[#DC2626] dark:text-[#F87171]'
                      : emp.riskTier === 'Moderate'
                        ? 'text-[#C25E00] dark:text-[#F58220]'
                        : 'text-[#15803D] dark:text-[#4ADE80]';

                  return (
                    <tr
                      key={emp.employeeId}
                      onClick={() => onSelectEmployee(emp)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectEmployee(emp);
                        }
                      }}
                      className="hover:bg-[#FFC800]/10 dark:hover:bg-[#FFC800]/10 focus-visible:outline-2 focus-visible:outline-[#F58220] transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-mono-num text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {emp.employeeId}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-neutral-950 dark:text-neutral-50">
                          {emp.fullName}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {emp.jobTitle} · {emp.employmentType}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                        {emp.department}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {emp.location}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        L{emp.jobLevel}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {emp.yearsAtCompany} yrs
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num font-semibold text-neutral-950 dark:text-neutral-50 whitespace-nowrap">
                        {formatGbp(emp.monthlyIncomeGbp)}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono-num font-semibold whitespace-nowrap ${riskColor}`}>
                        {emp.riskScore} · {emp.riskTier}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={
                            emp.attrition === 'Yes'
                              ? 'font-semibold text-[#DC2626] dark:text-[#F87171]'
                              : 'font-medium text-neutral-700 dark:text-neutral-300'
                          }
                        >
                          {emp.attrition === 'Yes' ? 'Attrited' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="font-mono-num">
            {searchedAndSorted.length === 0
              ? '0 results'
              : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                  safePage * PAGE_SIZE,
                  searchedAndSorted.length
                )} of ${searchedAndSorted.length}`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono-num px-2">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
