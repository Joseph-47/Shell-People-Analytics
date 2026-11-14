import React from 'react';
import { RotateCcw } from 'lucide-react';
import { FilterState } from '../types/employee';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  options: {
    departments: string[];
    locations: string[];
    employmentTypes: string[];
    genders: string[];
  };
  totalCount: number;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  onReset,
  options,
  totalCount,
  filteredCount,
}) => {
  const hasActiveFilters =
    filters.department !== 'ALL' ||
    filters.location !== 'ALL' ||
    filters.employmentType !== 'ALL' ||
    filters.gender !== 'ALL' ||
    filters.attrition !== 'ALL';

  const selectClass =
    'w-full min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] px-3 py-2 text-xs font-medium text-neutral-900 dark:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#F58220] transition-colors cursor-pointer';

  const labelClass = 'block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1';

  return (
    <section
      aria-label="Workforce Filters"
      className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div>
          <label htmlFor="filter-department" className={labelClass}>
            Department
          </label>
          <select
            id="filter-department"
            value={filters.department}
            onChange={(e) => onChange({ ...filters, department: e.target.value })}
            className={selectClass}
          >
            <option value="ALL">All Departments</option>
            {options.departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-location" className={labelClass}>
            Location
          </label>
          <select
            id="filter-location"
            value={filters.location}
            onChange={(e) => onChange({ ...filters, location: e.target.value })}
            className={selectClass}
          >
            <option value="ALL">All UK Locations</option>
            {options.locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-employment" className={labelClass}>
            Employment Type
          </label>
          <select
            id="filter-employment"
            value={filters.employmentType}
            onChange={(e) => onChange({ ...filters, employmentType: e.target.value })}
            className={selectClass}
          >
            <option value="ALL">All Types</option>
            {options.employmentTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-gender" className={labelClass}>
            Gender
          </label>
          <select
            id="filter-gender"
            value={filters.gender}
            onChange={(e) => onChange({ ...filters, gender: e.target.value })}
            className={selectClass}
          >
            <option value="ALL">All Genders</option>
            {options.genders.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-attrition" className={labelClass}>
            Attrition
          </label>
          <select
            id="filter-attrition"
            value={filters.attrition}
            onChange={(e) => onChange({ ...filters, attrition: e.target.value })}
            className={selectClass}
          >
            <option value="ALL">All Staff (Active &amp; Left)</option>
            <option value="No">Active Only (No)</option>
            <option value="Yes">Attrited Only (Yes)</option>
          </select>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3 min-h-[40px]">
          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono-num whitespace-nowrap">
            {filteredCount} / {totalCount}
          </span>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </section>
  );
};
