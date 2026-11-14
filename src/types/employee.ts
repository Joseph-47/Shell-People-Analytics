export interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  age: number;
  maritalStatus: string;
  department: string;
  jobTitle: string;
  jobLevel: number;
  employmentType: string;
  location: string;
  hireDate: string;
  hireYear: number | null;
  yearsAtCompany: number;
  yearsInCurrentRole: number;
  yearsSinceLastPromotion: number;
  yearsWithCurrManager: number;
  education: string;
  distanceFromHomeKm: number;
  businessTravel: string;
  monthlyIncomeGbp: number;
  attrition: 'Yes' | 'No';
}

export interface FlightRiskFactor {
  criterion: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export type RiskTier = 'High' | 'Moderate' | 'Low';

export interface ScoredEmployee extends Employee {
  riskScore: number;
  riskTier: RiskTier;
  riskFactors: FlightRiskFactor[];
  levelMedianIncome: number;
  incomeDeltaPct: number;
}

export interface FilterState {
  department: string;
  location: string;
  employmentType: string;
  gender: string;
  attrition: string;
}

export interface DataSourceInfo {
  type: 'sheet' | 'csv';
  label: string;
  lastSyncedAt: string;
  rowCount: number;
}

export interface KpiMetric {
  label: string;
  value: string;
  sublabel: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

export interface InsightItem {
  id: string;
  category: string;
  severity: 'High' | 'Watch' | 'Nominal';
  headline: string;
  detail: string;
  metricValue: string;
}

export interface ActionItem {
  id: string;
  priority: 'Immediate' | 'Near-Term' | 'Preventive';
  title: string;
  targetGroup: string;
  rationale: string;
  recommendedStep: string;
  impactScope: string;
}

export type TabKey = 'overview' | 'deep-dive' | 'insights';
