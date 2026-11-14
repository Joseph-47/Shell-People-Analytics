import { Employee } from '../types/employee';

export const SHEET_ID = '1mFXXQzEZAtSEaTQaasRCOtFnOVu6CnsbvuroABIos08';
export const SHEET_GID = '901218343';
export const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;

const REQUIRED_COLUMNS = [
  'EmployeeID',
  'FirstName',
  'LastName',
  'Gender',
  'Age',
  'Department',
  'JobTitle',
  'JobLevel',
  'EmploymentType',
  'Location',
  'HireDate',
  'YearsAtCompany',
  'YearsSinceLastPromotion',
  'MonthlyIncome_GBP',
  'Attrition',
];

/**
 * Parses an RFC-4180 CSV string into a 2D array of string cells.
 * Handles BOM, CRLF/LF/CR line endings, quoted newlines, and escaped quotes ("").
 */
export function parseCsvMatrix(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parseNumber(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const cleaned = val.replace(/[£$,\s]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAttrition(val: string | undefined): 'Yes' | 'No' {
  const normalized = (val ?? '').trim().toLowerCase();
  if (normalized === 'yes' || normalized === 'true' || normalized === '1' || normalized === 'left') {
    return 'Yes';
  }
  return 'No';
}

function parseHireYear(hireDate: string): number | null {
  if (!hireDate) return null;
  const isoMatch = hireDate.match(/^(\d{4})[-/]/);
  if (isoMatch) {
    const yr = Number(isoMatch[1]);
    return yr >= 1950 && yr <= 2100 ? yr : null;
  }
  const parsed = new Date(hireDate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getFullYear();
  }
  return null;
}

export function parseEmployeeCsv(csvText: string): Employee[] {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new Error('The CSV response is empty. Check that the sheet contains employee rows or upload a valid CSV file.');
  }

  if (/^<!doctype html|^<html/i.test(trimmed)) {
    throw new Error(
      'Google Sheets returned an HTML sign-in or error page instead of CSV data. Sign in with Google to read private sheets via the Google Sheets API, or use the Upload CSV fallback.'
    );
  }

  const matrix = parseCsvMatrix(trimmed);
  return parseEmployeeMatrix(matrix);
}

export function parseEmployeeMatrix(matrix: string[][]): Employee[] {
  if (matrix.length < 2) {
    throw new Error('Spreadsheet must contain a header row and at least one employee record.');
  }

  const rawHeaders = matrix[0];
  const headerMap = new Map<string, number>();
  rawHeaders.forEach((h, idx) => {
    const clean = String(h ?? '').trim();
    if (clean) {
      headerMap.set(clean.toLowerCase(), idx);
    }
  });

  const missing = REQUIRED_COLUMNS.filter((col) => !headerMap.has(col.toLowerCase()));
  if (missing.length > 0) {
    throw new Error(
      `Missing expected column(s): ${missing.join(', ')}. Ensure the sheet matches the Shell UK employee dataset schema.`
    );
  }

  const getCell = (row: string[], name: string): string => {
    const idx = headerMap.get(name.toLowerCase());
    if (idx === undefined) return '';
    return String(row[idx] ?? '').trim();
  };

  const employees: Employee[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    const employeeId = getCell(row, 'EmployeeID');
    const firstName = getCell(row, 'FirstName');
    const lastName = getCell(row, 'LastName');

    if (!employeeId && !firstName && !lastName) {
      continue;
    }

    const hireDate = getCell(row, 'HireDate');
    employees.push({
      employeeId: employeeId || `ROW-${r}`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || employeeId,
      gender: getCell(row, 'Gender') || 'Unspecified',
      age: parseNumber(getCell(row, 'Age'), 0),
      maritalStatus: getCell(row, 'MaritalStatus') || 'Unspecified',
      department: getCell(row, 'Department') || 'Unassigned',
      jobTitle: getCell(row, 'JobTitle') || 'Unspecified',
      jobLevel: parseNumber(getCell(row, 'JobLevel'), 1),
      employmentType: getCell(row, 'EmploymentType') || 'Full-Time',
      location: getCell(row, 'Location') || 'Unspecified',
      hireDate,
      hireYear: parseHireYear(hireDate),
      yearsAtCompany: parseNumber(getCell(row, 'YearsAtCompany'), 0),
      yearsInCurrentRole: parseNumber(getCell(row, 'YearsInCurrentRole'), 0),
      yearsSinceLastPromotion: parseNumber(getCell(row, 'YearsSinceLastPromotion'), 0),
      yearsWithCurrManager: parseNumber(getCell(row, 'YearsWithCurrManager'), 0),
      education: getCell(row, 'Education') || 'Unspecified',
      distanceFromHomeKm: parseNumber(getCell(row, 'DistanceFromHome_km'), 0),
      businessTravel: getCell(row, 'BusinessTravel') || 'Non-Travel',
      monthlyIncomeGbp: parseNumber(getCell(row, 'MonthlyIncome_GBP'), 0),
      attrition: normalizeAttrition(getCell(row, 'Attrition')),
    });
  }

  if (employees.length === 0) {
    throw new Error('No valid employee records could be parsed from the CSV.');
  }

  return employees;
}

export async function fetchGoogleSheetCsv(): Promise<Employee[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const cacheBustUrl = `${SHEET_CSV_URL}&_ts=${Date.now()}`;
    const response = await fetch(cacheBustUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Access denied (HTTP ${response.status}) when reading the Google Sheet. Confirm link sharing is public, or use Upload CSV.`
        );
      }
      if (response.status === 404) {
        throw new Error(
          `Google Sheet or tab gid=${SHEET_GID} not found (HTTP 404). Verify the sheet URL or upload a CSV file.`
        );
      }
      throw new Error(
        `Google Sheets returned HTTP ${response.status} (${response.statusText || 'Request failed'}). Try again or upload a CSV file.`
      );
    }

    const text = await response.text();
    return parseEmployeeCsv(text);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Request to Google Sheets timed out after 15 seconds. Check your connection or use the Upload CSV fallback.'
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        'Network or CORS error while reaching Google Sheets gviz endpoint. Check connectivity / browser privacy blockers, or use the Upload CSV fallback.'
      );
    }
    throw err instanceof Error
      ? err
      : new Error('Unable to read the Google Sheet. Use the Upload CSV fallback to load data locally.');
  } finally {
    window.clearTimeout(timeout);
  }
}
