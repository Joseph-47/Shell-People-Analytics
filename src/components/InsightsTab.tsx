import React, { useMemo } from 'react';
import { ExternalLink, FileSpreadsheet } from 'lucide-react';
import { FilterState, ScoredEmployee } from '../types/employee';
import { formatGbp, generateActions, generateInsights } from '../utils/analytics';

interface InsightsTabProps {
  employees: ScoredEmployee[];
  filters: FilterState;
  onClearAttritionFilter: () => void;
  onSelectEmployee: (emp: ScoredEmployee) => void;
  hasAccessToken: boolean;
  onRequestExportWatchlist: (watchlist: ScoredEmployee[]) => void;
  onRequestGoogleSignIn: () => void;
  lastExportUrl: string | null;
}

const SCORING_RUBRIC = [
  {
    criterion: 'Promotion Stagnation',
    weight: '0–25 pts',
    rule: '≥ 5 yrs (+25), 3–4 yrs (+15), 2 yrs (+8) since last promotion',
  },
  {
    criterion: 'Business Travel Strain',
    weight: '0–20 pts',
    rule: 'Travel_Frequently (+20), Travel_Rarely (+8), Non-Travel (0)',
  },
  {
    criterion: 'Compensation vs. Level Median',
    weight: '0–20 pts',
    rule: '≤ -15% below Job Level median (+20), -5% to -15% (+12), < 0% (+5)',
  },
  {
    criterion: 'Commute Distance',
    weight: '0–15 pts',
    rule: '≥ 30 km (+15), 15–29 km (+8), < 15 km (0)',
  },
  {
    criterion: 'Tenure & Manager Stability',
    weight: '0–20 pts',
    rule: 'Tenure ≤ 2 yrs (+10) or ≥ 5 yrs in role (+10); ≤ 1 yr with manager (+10), capped at 20',
  },
];

export const InsightsTab: React.FC<InsightsTabProps> = ({
  employees,
  filters,
  onClearAttritionFilter,
  onSelectEmployee,
  hasAccessToken,
  onRequestExportWatchlist,
  onRequestGoogleSignIn,
  lastExportUrl,
}) => {
  const insights = useMemo(() => generateInsights(employees), [employees]);
  const actions = useMemo(() => generateActions(employees), [employees]);

  const topWatchlist = useMemo(() => {
    return employees
      .filter((e) => e.attrition === 'No')
      .sort((a, b) => {
        if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
        return b.monthlyIncomeGbp - a.monthlyIncomeGbp;
      })
      .slice(0, 10);
  }, [employees]);

  const severityLabelClass = (severity: 'High' | 'Watch' | 'Nominal') => {
    if (severity === 'High') return 'text-[#DC2626] dark:text-[#F87171]';
    if (severity === 'Watch') return 'text-[#C25E00] dark:text-[#F58220]';
    return 'text-[#15803D] dark:text-[#4ADE80]';
  };

  const priorityLabelClass = (priority: 'Immediate' | 'Near-Term' | 'Preventive') => {
    if (priority === 'Immediate') return 'text-[#DC2626] dark:text-[#F87171]';
    if (priority === 'Near-Term') return 'text-[#C25E00] dark:text-[#F58220]';
    return 'text-neutral-700 dark:text-neutral-300';
  };

  if (employees.length === 0) {
    return (
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-10 text-center">
        <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
          No workforce records match the selected filters
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Adjust or reset the shared filters above to regenerate workforce findings, watchlist rankings, and actions.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Auto-Generated Findings */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-neutral-950 dark:text-neutral-50">
              Auto-Generated Workforce Findings
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Computed live across {employees.length} filtered employee records.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-5 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-neutral-600 dark:text-neutral-400">
                    {item.category}
                  </span>
                  <span className={`font-semibold ${severityLabelClass(item.severity)}`}>
                    {item.severity}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-neutral-950 dark:text-neutral-50 leading-snug">
                  {item.headline}
                </h3>
                <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {item.detail}
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs font-mono-num font-semibold text-neutral-900 dark:text-neutral-100">
                {item.metricValue}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 2. Top-10 Watchlist + Transparent Scoring Rule */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Top-10 Flight-Risk Watchlist (2 cols) */}
        <section className="xl:col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">
                Top-10 Active Flight-Risk Watchlist
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Highest-scoring active employees ranked by transparent 100-point risk model. Click a row to inspect.
              </p>
            </div>

            {topWatchlist.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {lastExportUrl && (
                  <a
                    href={lastExportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-[#C25E00] dark:text-[#FFC800] hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap"
                  >
                    <span>Open Exported Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                )}

                {hasAccessToken ? (
                  <button
                    type="button"
                    onClick={() => onRequestExportWatchlist(topWatchlist)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg bg-[#FFC800] hover:bg-[#eab600] text-xs font-bold text-neutral-950 whitespace-nowrap cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Save Watchlist to Sheets</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onRequestGoogleSignIn}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#F58220]" aria-hidden="true" />
                    <span>Sign in to Export to Sheets</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {filters.attrition === 'Yes' || topWatchlist.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {filters.attrition === 'Yes'
                  ? 'The Flight-Risk Watchlist monitors active employees at risk of leaving, but the Attrition filter is currently set to Attrited Only (Yes).'
                  : 'No active employees remain in the current filter selection.'}
              </p>
              {filters.attrition === 'Yes' && (
                <button
                  type="button"
                  onClick={onClearAttritionFilter}
                  className="inline-flex items-center justify-center px-4 py-2 min-h-[40px] rounded-lg bg-[#FFC800] hover:bg-[#eab600] text-xs font-bold text-neutral-950 cursor-pointer"
                >
                  Show Active &amp; All Employees
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#19191C] text-neutral-600 dark:text-neutral-400">
                    <th className="py-3 px-4 font-semibold">#</th>
                    <th className="py-3 px-4 font-semibold">Employee</th>
                    <th className="py-3 px-4 font-semibold">Department / Site</th>
                    <th className="py-3 px-4 font-semibold text-right">Income</th>
                    <th className="py-3 px-4 font-semibold text-right">Score</th>
                    <th className="py-3 px-4 font-semibold">Primary Drivers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                  {topWatchlist.map((emp, idx) => {
                    const topDrivers = [...emp.riskFactors]
                      .filter((f) => f.points > 0)
                      .sort((a, b) => b.points - a.points)
                      .slice(0, 2)
                      .map((f) => `${f.criterion} (+${f.points})`)
                      .join(' · ');

                    const scoreClass =
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
                        className="hover:bg-[#FFC800]/10 dark:hover:bg-[#FFC800]/10 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono-num text-neutral-500 dark:text-neutral-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-neutral-950 dark:text-neutral-50">
                            {emp.fullName}
                          </div>
                          <div className="text-[11px] font-mono-num text-neutral-500 dark:text-neutral-400">
                            {emp.employeeId} · {emp.jobTitle} (L{emp.jobLevel})
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                          <div>{emp.department}</div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {emp.location}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                          {formatGbp(emp.monthlyIncomeGbp)}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono-num font-bold whitespace-nowrap ${scoreClass}`}>
                          {emp.riskScore} / 100
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400 min-w-[200px]">
                          {topDrivers || 'Low combined exposure'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Transparent Scoring Rule */}
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-5">
          <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">
            Transparent Flight-Risk Rule
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Deterministic 100-point rubric with no black-box weights. High Risk ≥ 60 · Moderate 35–59 · Low &lt; 35.
          </p>

          <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
            {SCORING_RUBRIC.map((item) => (
              <div key={item.criterion} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {item.criterion}
                  </span>
                  <span className="text-xs font-mono-num font-semibold text-[#C25E00] dark:text-[#FFC800] whitespace-nowrap">
                    {item.weight}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {item.rule}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 3. Recommended Actions */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-neutral-950 dark:text-neutral-50">
            Recommended HR Actions
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Prioritised retention interventions calibrated to the filtered workforce.
          </p>
        </div>

        {actions.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-6 text-xs text-neutral-500 dark:text-neutral-400">
            No immediate retention actions triggered for this filtered segment.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {actions.map((act, index) => (
              <article
                key={act.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono-num text-neutral-500 dark:text-neutral-400">
                      0{index + 1}. Action Plan
                    </span>
                    <span className={`font-semibold ${priorityLabelClass(act.priority)}`}>
                      {act.priority} Priority
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-neutral-950 dark:text-neutral-50">
                    {act.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Target: {act.targetGroup}
                  </p>
                  <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {act.rationale}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
                  <div className="text-xs text-neutral-900 dark:text-neutral-100">
                    <span className="font-semibold">Next step:</span> {act.recommendedStep}
                  </div>
                  <div className="text-xs font-mono-num text-[#C25E00] dark:text-[#FFC800] font-semibold">
                    Scope: {act.impactScope}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
