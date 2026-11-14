import { Employee, ScoredEmployee } from '../types/employee';
import { parseEmployeeMatrix } from './csvParser';

export interface SpreadsheetTabInfo {
  sheetId: number;
  title: string;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: SpreadsheetTabInfo[];
}

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export class OAuthExpiredError extends Error {
  constructor(message = 'Your Google session expired. Sign in with Google again to continue.') {
    super(message);
    this.name = 'OAuthExpiredError';
  }
}

async function googleApiFetch(url: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new OAuthExpiredError();
  }

  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
      const json = await res.json();
      if (json?.error?.message) {
        detail = json.error.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(`Google API error (${res.status}): ${detail}`);
  }

  return res;
}

export async function listDriveSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id,name,modifiedTime)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=25&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await googleApiFetch(url, accessToken);
  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}

export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const fields = encodeURIComponent('properties.title,sheets.properties(sheetId,title)');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${fields}`;
  const res = await googleApiFetch(url, accessToken);
  const data = await res.json();

  const sheets: SpreadsheetTabInfo[] = Array.isArray(data.sheets)
    ? data.sheets.map((s: { properties?: { sheetId?: number; title?: string } }) => ({
        sheetId: Number(s.properties?.sheetId ?? 0),
        title: String(s.properties?.title ?? 'Sheet1'),
      }))
    : [];

  return {
    spreadsheetId,
    title: String(data.properties?.title ?? 'Untitled Spreadsheet'),
    sheets,
  };
}

export async function fetchSheetEmployeesViaApi(
  spreadsheetId: string,
  accessToken: string,
  preferredGid?: number,
  preferredTabTitle?: string
): Promise<{
  employees: Employee[];
  spreadsheetTitle: string;
  tabTitle: string;
  tabs: SpreadsheetTabInfo[];
}> {
  const meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
  if (meta.sheets.length === 0) {
    throw new Error(`Spreadsheet "${meta.title}" contains no worksheet tabs.`);
  }

  let selectedTab = meta.sheets[0];
  if (preferredTabTitle) {
    const matchByTitle = meta.sheets.find((s) => s.title === preferredTabTitle);
    if (matchByTitle) selectedTab = matchByTitle;
  } else if (preferredGid !== undefined && Number.isFinite(preferredGid)) {
    const matchByGid = meta.sheets.find((s) => s.sheetId === preferredGid);
    if (matchByGid) selectedTab = matchByGid;
  }

  const escapedTab = `'${selectedTab.title.replace(/'/g, "''")}'`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(escapedTab)}?valueRenderOption=UNFORMATTED_VALUE`;
  const res = await googleApiFetch(url, accessToken);
  const data = await res.json();

  const rawValues: unknown[][] = Array.isArray(data.values) ? data.values : [];
  const matrix: string[][] = rawValues.map((row) =>
    Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : []
  );

  const employees = parseEmployeeMatrix(matrix);

  return {
    employees,
    spreadsheetTitle: meta.title,
    tabTitle: selectedTab.title,
    tabs: meta.sheets,
  };
}

export async function exportWatchlistToNewSheet(
  accessToken: string,
  title: string,
  watchlist: ScoredEmployee[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create a new Google Spreadsheet
  const createRes = await googleApiFetch('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Flight-Risk Watchlist' } }],
    }),
  });
  const created = await createRes.json();
  const spreadsheetId = String(created.spreadsheetId);
  const spreadsheetUrl = String(
    created.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  );

  // 2. Populate values
  const headers = [
    'Rank',
    'EmployeeID',
    'FullName',
    'JobTitle',
    'JobLevel',
    'Department',
    'Location',
    'MonthlyIncome_GBP',
    'YearsAtCompany',
    'YearsSinceLastPromotion',
    'BusinessTravel',
    'RiskScore',
    'RiskTier',
    'PrimaryDrivers',
  ];

  const rows = watchlist.map((emp, idx) => {
    const drivers = [...emp.riskFactors]
      .filter((f) => f.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .map((f) => `${f.criterion} (+${f.points})`)
      .join('; ');

    return [
      idx + 1,
      emp.employeeId,
      emp.fullName,
      emp.jobTitle,
      emp.jobLevel,
      emp.department,
      emp.location,
      emp.monthlyIncomeGbp,
      emp.yearsAtCompany,
      emp.yearsSinceLastPromotion,
      emp.businessTravel,
      emp.riskScore,
      emp.riskTier,
      drivers,
    ];
  });

  const range = encodeURIComponent("'Flight-Risk Watchlist'!A1");
  await googleApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers, ...rows] }),
    }
  );

  return { spreadsheetId, spreadsheetUrl };
}
