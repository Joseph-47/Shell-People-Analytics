import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ScoredEmployee } from '../types/employee';
import { formatGbp, formatTravelLabel } from '../utils/analytics';

interface EmployeeDrawerProps {
  employee: ScoredEmployee | null;
  onClose: () => void;
}

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({ employee, onClose }) => {
  useEffect(() => {
    if (!employee) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [employee, onClose]);

  if (!employee) return null;

  const tierTextClass =
    employee.riskTier === 'High'
      ? 'text-[#DC2626] dark:text-[#F87171]'
      : employee.riskTier === 'Moderate'
        ? 'text-[#C25E00] dark:text-[#F58220]'
        : 'text-[#15803D] dark:text-[#4ADE80]';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Employee profile ${employee.fullName}`}
    >
      <aside
        className="w-full max-w-md bg-white dark:bg-[#141416] border-l border-neutral-200 dark:border-neutral-800 h-full overflow-y-auto p-6 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div>
            <div className="text-xs font-mono-num text-neutral-500 dark:text-neutral-400">
              {employee.employeeId} · Level {employee.jobLevel} ·{' '}
              {employee.attrition === 'Yes' ? 'Attrited (Left)' : 'Active'}
            </div>
            <h2 className="mt-1 text-xl font-bold text-neutral-950 dark:text-neutral-50">
              {employee.fullName}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {employee.jobTitle} · {employee.department}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close employee profile"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Flight Risk Summary */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Transparent Flight-Risk Score
            </span>
            <span className={`text-sm font-bold font-mono-num ${tierTextClass}`}>
              {employee.riskScore} / 100 · {employee.riskTier} Risk
            </span>
          </div>

          <div className="mt-3 h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${employee.riskScore}%`,
                backgroundColor:
                  employee.riskTier === 'High'
                    ? '#DC2626'
                    : employee.riskTier === 'Moderate'
                      ? '#F58220'
                      : '#16A34A',
              }}
            />
          </div>

          <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
            {employee.riskFactors.map((factor) => (
              <div key={factor.criterion} className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {factor.criterion}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {factor.detail}
                  </div>
                </div>
                <span className="text-xs font-mono-num font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                  +{factor.points} / {factor.maxPoints}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Attributes */}
        <div>
          <h3 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-3">
            Workforce Record
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-neutral-200 dark:border-neutral-800 pt-3">
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Location</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100 mt-0.5">
                {employee.location}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Employment Type</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100 mt-0.5">
                {employee.employmentType}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Monthly Income</dt>
              <dd className="font-mono-num font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
                {formatGbp(employee.monthlyIncomeGbp)}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Level {employee.jobLevel} Median</dt>
              <dd className="font-mono-num font-medium text-neutral-900 dark:text-neutral-100 mt-0.5">
                {formatGbp(employee.levelMedianIncome)} ({employee.incomeDeltaPct >= 0 ? '+' : ''}
                {employee.incomeDeltaPct.toFixed(1)}%)
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Hire Date</dt>
              <dd className="font-mono-num text-neutral-900 dark:text-neutral-100 mt-0.5">
                {employee.hireDate || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Tenure / In Role</dt>
              <dd className="font-mono-num text-neutral-900 dark:text-neutral-100 mt-0.5">
                {employee.yearsAtCompany} yrs / {employee.yearsInCurrentRole} yrs
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Since Promotion</dt>
              <dd className="font-mono-num text-neutral-900 dark:text-neutral-100 mt-0.5">
                {employee.yearsSinceLastPromotion} yrs
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">With Manager</dt>
              <dd className="font-mono-num text-neutral-900 dark:text-neutral-100 mt-0.5">
                {employee.yearsWithCurrManager} yrs
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Business Travel</dt>
              <dd className="text-neutral-900 dark:text-neutral-100 mt-0.5">
                {formatTravelLabel(employee.businessTravel)}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Commute Distance</dt>
              <dd className="font-mono-num text-neutral-900 dark:text-neutral-100 mt-0.5">
                {employee.distanceFromHomeKm} km
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Age / Gender</dt>
              <dd className="text-neutral-900 dark:text-neutral-100 mt-0.5">
                {employee.age} · {employee.gender}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Education</dt>
              <dd className="text-neutral-900 dark:text-neutral-100 mt-0.5">
                {employee.education}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
};
