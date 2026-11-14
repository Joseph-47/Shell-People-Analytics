import {
  ActionItem,
  Employee,
  FilterState,
  FlightRiskFactor,
  InsightItem,
  KpiMetric,
  RiskTier,
  ScoredEmployee,
} from '../types/employee';

export function formatGbp(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatCompactGbp(amount: number): string {
  if (amount >= 1_000_000) {
    return `£${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `£${(amount / 1_000).toFixed(1)}k`;
  }
  return formatGbp(amount);
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatTravelLabel(raw: string): string {
  if (raw === 'Travel_Frequently') return 'Frequent Travel';
  if (raw === 'Travel_Rarely') return 'Rare Travel';
  if (raw === 'Non-Travel') return 'Non-Travel';
  return raw.replace(/_/g, ' ');
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computeAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Computes transparent 0-100 flight-risk scores for all employees against
 * full-dataset JobLevel median pay benchmarks.
 */
export function scoreEmployees(employees: Employee[]): ScoredEmployee[] {
  const incomesByLevel = new Map<number, number[]>();
  for (const emp of employees) {
    const arr = incomesByLevel.get(emp.jobLevel) ?? [];
    arr.push(emp.monthlyIncomeGbp);
    incomesByLevel.set(emp.jobLevel, arr);
  }

  const levelMedians = new Map<number, number>();
  incomesByLevel.forEach((vals, level) => {
    levelMedians.set(level, computeMedian(vals));
  });

  return employees.map((emp) => {
    const levelMedian = levelMedians.get(emp.jobLevel) || emp.monthlyIncomeGbp || 1;
    const incomeDeltaPct = ((emp.monthlyIncomeGbp - levelMedian) / levelMedian) * 100;
    const factors: FlightRiskFactor[] = [];

    // 1. Promotion Stagnation (max 25 pts)
    let promoPts = 0;
    let promoDetail = `${emp.yearsSinceLastPromotion} yrs since last promotion (low lag)`;
    if (emp.yearsSinceLastPromotion >= 5) {
      promoPts = 25;
      promoDetail = `${emp.yearsSinceLastPromotion} yrs without promotion (≥5 yr threshold)`;
    } else if (emp.yearsSinceLastPromotion >= 3) {
      promoPts = 15;
      promoDetail = `${emp.yearsSinceLastPromotion} yrs without promotion (3–4 yr band)`;
    } else if (emp.yearsSinceLastPromotion >= 2) {
      promoPts = 8;
      promoDetail = `${emp.yearsSinceLastPromotion} yrs without promotion (2 yr band)`;
    }
    factors.push({
      criterion: 'Promotion Stagnation',
      points: promoPts,
      maxPoints: 25,
      detail: promoDetail,
    });

    // 2. Business Travel Strain (max 20 pts)
    let travelPts = 0;
    let travelDetail = 'No regular business travel required';
    if (emp.businessTravel === 'Travel_Frequently') {
      travelPts = 20;
      travelDetail = 'Frequent business travel schedule';
    } else if (emp.businessTravel === 'Travel_Rarely') {
      travelPts = 8;
      travelDetail = 'Occasional business travel';
    }
    factors.push({
      criterion: 'Travel Strain',
      points: travelPts,
      maxPoints: 20,
      detail: travelDetail,
    });

    // 3. Pay vs. Level Median (max 20 pts)
    let payPts = 0;
    let payDetail = `${incomeDeltaPct >= 0 ? '+' : ''}${incomeDeltaPct.toFixed(1)}% vs L${emp.jobLevel} median (${formatGbp(levelMedian)})`;
    if (incomeDeltaPct <= -15) {
      payPts = 20;
    } else if (incomeDeltaPct <= -5) {
      payPts = 12;
    } else if (incomeDeltaPct < 0) {
      payPts = 5;
    }
    factors.push({
      criterion: 'Compensation Gap',
      points: payPts,
      maxPoints: 20,
      detail: payDetail,
    });

    // 4. Commute Distance (max 15 pts)
    let commutePts = 0;
    let commuteDetail = `${emp.distanceFromHomeKm} km commute (local range)`;
    if (emp.distanceFromHomeKm >= 30) {
      commutePts = 15;
      commuteDetail = `${emp.distanceFromHomeKm} km commute (≥30 km long haul)`;
    } else if (emp.distanceFromHomeKm >= 15) {
      commutePts = 8;
      commuteDetail = `${emp.distanceFromHomeKm} km commute (15–29 km band)`;
    }
    factors.push({
      criterion: 'Commute Distance',
      points: commutePts,
      maxPoints: 15,
      detail: commuteDetail,
    });

    // 5. Tenure & Manager Stability (max 20 pts)
    let stabilityPts = 0;
    const stabilityNotes: string[] = [];
    if (emp.yearsAtCompany <= 2) {
      stabilityPts += 10;
      stabilityNotes.push(`Early tenure (${emp.yearsAtCompany} yrs at Shell)`);
    } else if (emp.yearsInCurrentRole >= 5) {
      stabilityPts += 10;
      stabilityNotes.push(`Role plateau (${emp.yearsInCurrentRole} yrs in current role)`);
    }
    if (emp.yearsWithCurrManager <= 1) {
      stabilityPts += 10;
      stabilityNotes.push(`New manager (${emp.yearsWithCurrManager} yrs)`);
    }
    stabilityPts = Math.min(20, stabilityPts);
    factors.push({
      criterion: 'Tenure & Manager Stability',
      points: stabilityPts,
      maxPoints: 20,
      detail:
        stabilityNotes.length > 0
          ? stabilityNotes.join(' · ')
          : `${emp.yearsInCurrentRole} yrs in role · ${emp.yearsWithCurrManager} yrs with manager`,
    });

    const riskScore = Math.min(
      100,
      factors.reduce((sum, f) => sum + f.points, 0)
    );
    const riskTier: RiskTier = riskScore >= 60 ? 'High' : riskScore >= 35 ? 'Moderate' : 'Low';

    return {
      ...emp,
      riskScore,
      riskTier,
      riskFactors: factors,
      levelMedianIncome: levelMedian,
      incomeDeltaPct,
    };
  });
}

export function filterEmployees(employees: ScoredEmployee[], filters: FilterState): ScoredEmployee[] {
  return employees.filter((emp) => {
    if (filters.department !== 'ALL' && emp.department !== filters.department) return false;
    if (filters.location !== 'ALL' && emp.location !== filters.location) return false;
    if (filters.employmentType !== 'ALL' && emp.employmentType !== filters.employmentType) return false;
    if (filters.gender !== 'ALL' && emp.gender !== filters.gender) return false;
    if (filters.attrition !== 'ALL' && emp.attrition !== filters.attrition) return false;
    return true;
  });
}

export function extractFilterOptions(employees: ScoredEmployee[]) {
  const unique = (getter: (e: ScoredEmployee) => string) =>
    Array.from(new Set(employees.map(getter).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  return {
    departments: unique((e) => e.department),
    locations: unique((e) => e.location),
    employmentTypes: unique((e) => e.employmentType),
    genders: unique((e) => e.gender),
  };
}

export function computeOverviewKpis(filtered: ScoredEmployee[]): KpiMetric[] {
  const headcount = filtered.length;
  const leavers = filtered.filter((e) => e.attrition === 'Yes');
  const active = filtered.filter((e) => e.attrition === 'No');
  const attritionRate = headcount > 0 ? (leavers.length / headcount) * 100 : 0;
  const activeShare = headcount > 0 ? (active.length / headcount) * 100 : 0;
  const avgIncome = computeAverage(filtered.map((e) => e.monthlyIncomeGbp));
  const medianIncome = computeMedian(filtered.map((e) => e.monthlyIncomeGbp));
  const monthlyPayroll = filtered.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0);

  return [
    {
      label: 'Headcount',
      value: headcount.toLocaleString('en-GB'),
      sublabel: `${active.length} active · ${leavers.length} attrited`,
      tone: 'default',
    },
    {
      label: 'Attrition Rate',
      value: formatPct(attritionRate),
      sublabel: `${leavers.length} of ${headcount} employees left`,
      tone: attritionRate >= 20 ? 'danger' : attritionRate >= 12 ? 'warning' : 'success',
    },
    {
      label: 'Active Employees',
      value: active.length.toLocaleString('en-GB'),
      sublabel: `${formatPct(activeShare)} retention in view`,
      tone: 'default',
    },
    {
      label: 'Average Income',
      value: formatGbp(avgIncome),
      sublabel: `Median ${formatGbp(medianIncome)} / month`,
      tone: 'default',
    },
    {
      label: 'Monthly Payroll',
      value: formatCompactGbp(monthlyPayroll),
      sublabel: `${formatCompactGbp(monthlyPayroll * 12)} annualised`,
      tone: 'default',
    },
  ];
}

export function computeDeepDiveKpis(filtered: ScoredEmployee[]): KpiMetric[] {
  const count = filtered.length;
  const avgTenure = computeAverage(filtered.map((e) => e.yearsAtCompany));
  const femaleCount = filtered.filter((e) => e.gender === 'Female').length;
  const femaleShare = count > 0 ? (femaleCount / count) * 100 : 0;
  const nonFullTimeCount = filtered.filter((e) => e.employmentType !== 'Full-Time').length;
  const nonFullTimeShare = count > 0 ? (nonFullTimeCount / count) * 100 : 0;
  const avgPromoGap = computeAverage(filtered.map((e) => e.yearsSinceLastPromotion));
  const activeHighRisk = filtered.filter((e) => e.attrition === 'No' && e.riskScore >= 60).length;
  const activeCount = filtered.filter((e) => e.attrition === 'No').length;

  return [
    {
      label: 'Average Tenure',
      value: `${avgTenure.toFixed(1)} yrs`,
      sublabel: `Median ${computeMedian(filtered.map((e) => e.yearsAtCompany)).toFixed(1)} yrs at company`,
      tone: 'default',
    },
    {
      label: 'Female Share',
      value: formatPct(femaleShare),
      sublabel: `${femaleCount} of ${count} employees`,
      tone: 'default',
    },
    {
      label: 'Non-Full-Time Share',
      value: formatPct(nonFullTimeShare),
      sublabel: `${nonFullTimeCount} Part-Time or Contract`,
      tone: 'default',
    },
    {
      label: 'Years Since Promotion',
      value: `${avgPromoGap.toFixed(1)} yrs`,
      sublabel: `${filtered.filter((e) => e.yearsSinceLastPromotion >= 5).length} waiting ≥ 5 yrs`,
      tone: avgPromoGap >= 4 ? 'warning' : 'default',
    },
    {
      label: 'High Flight-Risk',
      value: activeHighRisk.toLocaleString('en-GB'),
      sublabel:
        activeCount > 0
          ? `${formatPct((activeHighRisk / activeCount) * 100)} of ${activeCount} active (Score ≥ 60)`
          : 'No active staff in current filter',
      tone: activeHighRisk >= 15 ? 'danger' : activeHighRisk > 0 ? 'warning' : 'success',
    },
  ];
}

export interface GroupBreakdown {
  label: string;
  total: number;
  active: number;
  attrited: number;
  attritionRate: number;
  avgIncome: number;
}

export function groupBreakdown(
  employees: ScoredEmployee[],
  keyFn: (e: ScoredEmployee) => string,
  sortBy: 'totalDesc' | 'labelAsc' | 'customOrder' = 'totalDesc',
  customOrder: string[] = []
): GroupBreakdown[] {
  const map = new Map<string, ScoredEmployee[]>();
  for (const emp of employees) {
    const k = keyFn(emp);
    const list = map.get(k) ?? [];
    list.push(emp);
    map.set(k, list);
  }

  const results: GroupBreakdown[] = [];
  map.forEach((list, label) => {
    const attrited = list.filter((e) => e.attrition === 'Yes').length;
    const active = list.length - attrited;
    results.push({
      label,
      total: list.length,
      active,
      attrited,
      attritionRate: list.length > 0 ? (attrited / list.length) * 100 : 0,
      avgIncome: computeAverage(list.map((e) => e.monthlyIncomeGbp)),
    });
  });

  if (sortBy === 'customOrder' && customOrder.length > 0) {
    const orderMap = new Map(customOrder.map((k, idx) => [k, idx]));
    results.sort((a, b) => (orderMap.get(a.label) ?? 999) - (orderMap.get(b.label) ?? 999));
  } else if (sortBy === 'labelAsc') {
    results.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    results.sort((a, b) => b.total - a.total);
  }

  return results;
}

export function getAgeBand(age: number): string {
  if (age < 25) return 'Under 25';
  if (age <= 34) return '25–34';
  if (age <= 44) return '35–44';
  if (age <= 54) return '45–54';
  return '55+';
}

export function getTenureBand(years: number): string {
  if (years < 2) return '< 2 yrs';
  if (years <= 4) return '2–4 yrs';
  if (years <= 9) return '5–9 yrs';
  if (years <= 14) return '10–14 yrs';
  return '15+ yrs';
}

export function computeHiringTrend(employees: ScoredEmployee[]): { year: string; hires: number }[] {
  const counts = new Map<number, number>();
  for (const emp of employees) {
    if (emp.hireYear !== null) {
      counts.set(emp.hireYear, (counts.get(emp.hireYear) ?? 0) + 1);
    }
  }
  const years = Array.from(counts.keys()).sort((a, b) => a - b);
  if (years.length === 0) return [];
  const minY = years[0];
  const maxY = years[years.length - 1];
  const series: { year: string; hires: number }[] = [];
  for (let y = minY; y <= maxY; y++) {
    series.push({ year: String(y), hires: counts.get(y) ?? 0 });
  }
  return series;
}

export function generateInsights(filtered: ScoredEmployee[]): InsightItem[] {
  if (filtered.length === 0) return [];

  const insights: InsightItem[] = [];
  const total = filtered.length;
  const leavers = filtered.filter((e) => e.attrition === 'Yes');
  const overallAttr = (leavers.length / total) * 100;

  // 1. Department attrition hotspot
  const byDept = groupBreakdown(filtered, (e) => e.department).filter((d) => d.total >= 3);
  if (byDept.length > 0) {
    const highestDept = [...byDept].sort((a, b) => b.attritionRate - a.attritionRate)[0];
    const lowestDept = [...byDept].sort((a, b) => a.attritionRate - b.attritionRate)[0];
    insights.push({
      id: 'dept-attrition',
      category: 'Department Attrition',
      severity: highestDept.attritionRate >= 25 ? 'High' : highestDept.attritionRate >= 15 ? 'Watch' : 'Nominal',
      headline: `${highestDept.label} leads attrition at ${formatPct(highestDept.attritionRate)}`,
      detail: `${highestDept.attrited} of ${highestDept.total} employees exited vs. ${formatPct(overallAttr)} overall. Lowest turnover is ${lowestDept.label} (${formatPct(lowestDept.attritionRate)}).`,
      metricValue: `${highestDept.attrited}/${highestDept.total} exits`,
    });
  }

  // 2. Travel & Attrition correlation
  const byTravel = groupBreakdown(filtered, (e) => e.businessTravel);
  const freqTravel = byTravel.find((t) => t.label === 'Travel_Frequently');
  const nonTravel = byTravel.find((t) => t.label === 'Non-Travel');
  if (freqTravel && nonTravel && freqTravel.total > 0 && nonTravel.total > 0) {
    const gap = freqTravel.attritionRate - nonTravel.attritionRate;
    insights.push({
      id: 'travel-impact',
      category: 'Mobility & Travel Strain',
      severity: freqTravel.attritionRate >= 25 || gap >= 10 ? 'High' : 'Watch',
      headline:
        gap >= 0
          ? `Frequent travellers attrite ${gap.toFixed(1)} pts higher than non-travellers`
          : `Frequent travel attrition sits at ${formatPct(freqTravel.attritionRate)}`,
      detail: `Travel_Frequently cohort (${freqTravel.total} staff) shows ${formatPct(freqTravel.attritionRate)} attrition vs. ${formatPct(nonTravel.attritionRate)} for Non-Travel (${nonTravel.total} staff).`,
      metricValue: formatPct(freqTravel.attritionRate),
    });
  }

  // 3. Location footprint hotspot
  const byLoc = groupBreakdown(filtered, (e) => e.location).filter((l) => l.total >= 3);
  if (byLoc.length > 0) {
    const topLoc = [...byLoc].sort((a, b) => b.attritionRate - a.attritionRate)[0];
    insights.push({
      id: 'location-hotspot',
      category: 'UK Site Footprint',
      severity: topLoc.attritionRate >= 22 ? 'High' : topLoc.attritionRate >= 14 ? 'Watch' : 'Nominal',
      headline: `${topLoc.label} records highest regional attrition (${formatPct(topLoc.attritionRate)})`,
      detail: `${topLoc.attrited} departures out of ${topLoc.total} employees based in ${topLoc.label}, with average pay of ${formatGbp(topLoc.avgIncome)}/mo.`,
      metricValue: formatPct(topLoc.attritionRate),
    });
  }

  // 4. Gender pay & representation parity
  const females = filtered.filter((e) => e.gender === 'Female');
  const males = filtered.filter((e) => e.gender === 'Male');
  if (females.length > 0 && males.length > 0) {
    const fAvg = computeAverage(females.map((e) => e.monthlyIncomeGbp));
    const mAvg = computeAverage(males.map((e) => e.monthlyIncomeGbp));
    const payGapPct = ((mAvg - fAvg) / mAvg) * 100;
    insights.push({
      id: 'gender-pay',
      category: 'Pay & Representation',
      severity: Math.abs(payGapPct) >= 8 ? 'Watch' : 'Nominal',
      headline:
        Math.abs(payGapPct) < 2
          ? `Gender pay parity within ${Math.abs(payGapPct).toFixed(1)}% across selection`
          : payGapPct > 0
            ? `Female average pay trails male average by ${payGapPct.toFixed(1)}%`
            : `Female average pay exceeds male average by ${Math.abs(payGapPct).toFixed(1)}%`,
      detail: `Female cohort (${females.length} staff, ${formatPct((females.length / total) * 100)}) averages ${formatGbp(fAvg)}/mo vs. ${formatGbp(mAvg)}/mo for Male (${males.length} staff).`,
      metricValue: `${formatGbp(fAvg)} vs ${formatGbp(mAvg)}`,
    });
  }

  // 5. Promotion stagnation & active flight risk
  const active = filtered.filter((e) => e.attrition === 'No');
  const highRisk = active.filter((e) => e.riskScore >= 60);
  const stagnant = active.filter((e) => e.yearsSinceLastPromotion >= 5);
  if (active.length > 0) {
    const payrollAtRisk = highRisk.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0);
    insights.push({
      id: 'flight-risk-exposure',
      category: 'Retention Exposure',
      severity: highRisk.length >= 15 || (highRisk.length / active.length) >= 0.15 ? 'High' : highRisk.length > 0 ? 'Watch' : 'Nominal',
      headline: `${highRisk.length} active employees flagged as High Flight-Risk (Score ≥ 60)`,
      detail: `Represents ${formatCompactGbp(payrollAtRisk)}/mo in active payroll (${formatCompactGbp(payrollAtRisk * 12)} annualised). ${stagnant.length} active staff have waited ≥ 5 years for promotion.`,
      metricValue: `${formatCompactGbp(payrollAtRisk)}/mo`,
    });
  }

  // 6. Pay compression / level benchmark check
  const underpaidActive = active.filter((e) => e.incomeDeltaPct <= -15);
  if (active.length > 0) {
    insights.push({
      id: 'comp-benchmark',
      category: 'Compensation Competitiveness',
      severity: underpaidActive.length >= 15 ? 'High' : underpaidActive.length >= 5 ? 'Watch' : 'Nominal',
      headline: `${underpaidActive.length} active employees sit >15% below their Job Level median`,
      detail: `Below-band compensation combined with promotion lag is a primary driver of Score ≥ 60 retention risk in the filtered workforce.`,
      metricValue: `${underpaidActive.length} below band`,
    });
  }

  return insights;
}

export function generateActions(filtered: ScoredEmployee[]): ActionItem[] {
  const active = filtered.filter((e) => e.attrition === 'No');
  if (filtered.length === 0) return [];

  const actions: ActionItem[] = [];
  const highRisk = active.filter((e) => e.riskScore >= 60);

  // Action 1: High-risk watchlist manager stay interviews
  if (highRisk.length > 0) {
    const topDepts = groupBreakdown(highRisk, (e) => e.department)
      .slice(0, 2)
      .map((d) => `${d.label} (${d.total})`)
      .join(', ');
    actions.push({
      id: 'act-stay-interviews',
      priority: 'Immediate',
      title: 'Conduct targeted stay interviews for High Flight-Risk cohort',
      targetGroup: `${highRisk.length} active employees · Top concentration: ${topDepts}`,
      rationale: 'Employees scoring ≥ 60 combine multiple attrition triggers (promotion lag, travel strain, or below-median pay).',
      recommendedStep: 'Schedule 1:1 career & workload reviews with HRBP and line managers within 14 days for the Top-10 Watchlist.',
      impactScope: `${formatCompactGbp(highRisk.reduce((s, e) => s + e.monthlyIncomeGbp * 12, 0))} annual payroll protected`,
    });
  }

  // Action 2: Promotion stagnation review
  const stagnant = active.filter((e) => e.yearsSinceLastPromotion >= 5);
  if (stagnant.length > 0) {
    const avgLevel = computeAverage(stagnant.map((e) => e.jobLevel));
    actions.push({
      id: 'act-promo-calibration',
      priority: stagnant.length >= 10 ? 'Immediate' : 'Near-Term',
      title: 'Run promotion & progression calibration for 5+ year plateau group',
      targetGroup: `${stagnant.length} active employees with ≥ 5 years since last promotion (Avg L${avgLevel.toFixed(1)})`,
      rationale: 'Extended time without progression awards 25/100 risk points and signals stalled internal mobility.',
      recommendedStep: 'Audit readiness for lateral skill moves, grade progression, or technical specialist tracks in the next cycle.',
      impactScope: `${formatPct((stagnant.length / Math.max(1, active.length)) * 100)} of active cohort`,
    });
  }

  // Action 3: Frequent travel mitigation
  const freqTravelActive = active.filter((e) => e.businessTravel === 'Travel_Frequently');
  const freqAll = filtered.filter((e) => e.businessTravel === 'Travel_Frequently');
  const freqAttr = freqAll.length > 0 ? (freqAll.filter((e) => e.attrition === 'Yes').length / freqAll.length) * 100 : 0;
  if (freqTravelActive.length > 0) {
    actions.push({
      id: 'act-travel-rotation',
      priority: freqAttr >= 22 ? 'Immediate' : 'Near-Term',
      title: 'Introduce travel rotation & recovery days for frequent travellers',
      targetGroup: `${freqTravelActive.length} active frequent-travel staff (${formatPct(freqAttr)} historical attrition)`,
      rationale: 'High-travel roles show elevated churn risk when paired with long commutes or manager changes.',
      recommendedStep: 'Cap consecutive site-travel weeks, expand remote site-support handoffs, and offer flexible post-trip rest.',
      impactScope: `${freqTravelActive.length} active roles stabilised`,
    });
  }

  // Action 4: Pay-band equity adjustment
  const underpaidActive = active.filter((e) => e.incomeDeltaPct <= -15);
  if (underpaidActive.length > 0) {
    const totalLiftMonthly = underpaidActive.reduce(
      (sum, e) => sum + Math.max(0, e.levelMedianIncome * 0.9 - e.monthlyIncomeGbp),
      0
    );
    actions.push({
      id: 'act-pay-realignment',
      priority: 'Near-Term',
      title: 'Realign employees >15% below Job Level median pay',
      targetGroup: `${underpaidActive.length} active employees across Levels 1–5`,
      rationale: 'Significant below-median pay creates immediate external poaching vulnerability in UK energy & engineering markets.',
      recommendedStep: 'Prioritise market-adjustment stipends to bring critical talent within 10% of internal level medians.',
      impactScope: `Est. ${formatGbp(totalLiftMonthly)}/mo to reach 90% of median`,
    });
  }

  // Action 5: Early-tenure / new-manager onboarding check-in
  const onboardingRisk = active.filter((e) => e.yearsAtCompany <= 2 || e.yearsWithCurrManager <= 1);
  if (onboardingRisk.length > 0) {
    actions.push({
      id: 'act-manager-checkin',
      priority: 'Preventive',
      title: 'Strengthen 90-day manager transition & early-tenure check-ins',
      targetGroup: `${onboardingRisk.length} active staff with ≤ 2 yrs tenure or ≤ 1 yr with current manager`,
      rationale: 'New hires and employees under newly assigned managers face higher detachment before building internal networks.',
      recommendedStep: 'Deploy structured 30/60/90-day manager alignment guides and peer mentoring across UK hubs.',
      impactScope: `${onboardingRisk.length} employees in transition window`,
    });
  }

  return actions;
}
