import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { AlertTriangle, RefreshCw, Upload, X } from 'lucide-react';
import { ConfirmExportModal } from './components/ConfirmExportModal';
import { DeepDiveTab } from './components/DeepDiveTab';
import { EmployeeDrawer } from './components/EmployeeDrawer';
import { FilterBar } from './components/FilterBar';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { Header } from './components/Header';
import { InsightsTab } from './components/InsightsTab';
import { OverviewTab } from './components/OverviewTab';
import { DataSourceInfo, FilterState, ScoredEmployee, TabKey } from './types/employee';
import {
  extractFilterOptions,
  filterEmployees,
  scoreEmployees,
} from './utils/analytics';
import {
  fetchGoogleSheetCsv,
  parseEmployeeCsv,
  SHEET_GID,
  SHEET_ID,
} from './utils/csvParser';
import {
  clearAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './utils/googleAuth';
import {
  exportWatchlistToNewSheet,
  fetchSheetEmployeesViaApi,
  OAuthExpiredError,
} from './utils/googleSheetsApi';

const INITIAL_FILTERS: FilterState = {
  department: 'ALL',
  location: 'ALL',
  employmentType: 'ALL',
  gender: 'ALL',
  attrition: 'ALL',
};

function formatSyncTime(): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Google OAuth state (token cached strictly in memory via googleAuth.ts)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Target spreadsheet / tab state
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState<string>(SHEET_ID);
  const [activeTabTitle, setActiveTabTitle] = useState<string | null>(null);
  const [isSheetPickerOpen, setIsSheetPickerOpen] = useState<boolean>(false);

  // Export watchlist confirmation state
  const [pendingExportWatchlist, setPendingExportWatchlist] = useState<ScoredEmployee[] | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null);

  // Dataset state
  const [employees, setEmployees] = useState<ScoredEmployee[]>([]);
  const [dataSource, setDataSource] = useState<DataSourceInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedEmployee, setSelectedEmployee] = useState<ScoredEmployee | null>(null);

  const fallbackFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return unsubscribe;
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      try {
        localStorage.setItem('shell-pa-theme', next ? 'dark' : 'light');
      } catch {
        // Ignore storage restrictions
      }
      return next;
    });
  }, []);

  const syncFromSheet = useCallback(
    async (
      isInitial = false,
      overrideSpreadsheetId?: string,
      overrideTabTitle?: string,
      overrideToken?: string | null
    ) => {
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsSyncing(true);
      }
      setErrorMessage(null);

      const targetId = overrideSpreadsheetId ?? activeSpreadsheetId;
      const targetTab = overrideTabTitle !== undefined ? overrideTabTitle : activeTabTitle ?? undefined;
      const token = overrideToken !== undefined ? overrideToken : getAccessToken();

      try {
        if (token) {
          const result = await fetchSheetEmployeesViaApi(
            targetId,
            token,
            targetId === SHEET_ID && !targetTab ? Number(SHEET_GID) : undefined,
            targetTab
          );
          const scored = scoreEmployees(result.employees);
          setEmployees(scored);
          setActiveSpreadsheetId(targetId);
          setActiveTabTitle(result.tabTitle);
          setDataSource({
            type: 'sheet',
            label: `Google Sheets API · ${result.spreadsheetTitle} (${result.tabTitle})`,
            lastSyncedAt: formatSyncTime(),
            rowCount: scored.length,
          });
        } else {
          const rawEmployees = await fetchGoogleSheetCsv();
          const scored = scoreEmployees(rawEmployees);
          setEmployees(scored);
          setDataSource({
            type: 'sheet',
            label: 'Google Sheets (Public Feed)',
            lastSyncedAt: formatSyncTime(),
            rowCount: scored.length,
          });
        }
      } catch (err) {
        if (err instanceof OAuthExpiredError) {
          clearAccessToken();
          setAccessToken(null);
        }
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to read Google Sheet. Please retry, sign in with Google, or upload a CSV file.';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    },
    [activeSpreadsheetId, activeTabTitle]
  );

  useEffect(() => {
    syncFromSheet(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      setGoogleUser(result.user);
      setAccessToken(result.accessToken);
      await syncFromSheet(false, activeSpreadsheetId, activeTabTitle ?? undefined, result.accessToken);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Google sign-in could not be completed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoggingIn(false);
    }
  }, [activeSpreadsheetId, activeTabTitle, syncFromSheet]);

  const handleGoogleLogout = useCallback(async () => {
    await logout();
    setGoogleUser(null);
    setAccessToken(null);
  }, []);

  const handleUploadCsv = useCallback((file: File) => {
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const rawEmployees = parseEmployeeCsv(text);
        const scored = scoreEmployees(rawEmployees);
        setEmployees(scored);
        setFilters(INITIAL_FILTERS);
        setDataSource({
          type: 'csv',
          label: `CSV: ${file.name}`,
          lastSyncedAt: formatSyncTime(),
          rowCount: scored.length,
        });
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not parse uploaded CSV file. Verify column headers and formatting.';
        setErrorMessage(msg);
      }
    };
    reader.onerror = () => {
      setErrorMessage(`Unable to read local file "${file.name}". Please check file permissions and retry.`);
    };
    reader.readAsText(file);
  }, []);

  const exportTitle = useMemo(() => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    const deptTag = filters.department === 'ALL' ? 'All UK' : filters.department;
    return `Shell Flight-Risk Watchlist · ${deptTag} (${dateStamp})`;
  }, [filters.department]);

  const handleConfirmExport = useCallback(async () => {
    if (!pendingExportWatchlist) return;
    const token = getAccessToken();
    if (!token) {
      setPendingExportWatchlist(null);
      setErrorMessage('Sign in with Google to export the watchlist to Google Sheets.');
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    try {
      const { spreadsheetUrl } = await exportWatchlistToNewSheet(
        token,
        exportTitle,
        pendingExportWatchlist
      );
      setLastExportUrl(spreadsheetUrl);
      setPendingExportWatchlist(null);
    } catch (err) {
      if (err instanceof OAuthExpiredError) {
        clearAccessToken();
        setAccessToken(null);
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to create Google Sheet for watchlist export.'
      );
      setPendingExportWatchlist(null);
    } finally {
      setIsExporting(false);
    }
  }, [exportTitle, pendingExportWatchlist]);

  const filterOptions = useMemo(() => extractFilterOptions(employees), [employees]);
  const filteredEmployees = useMemo(
    () => filterEmployees(employees, filters),
    [employees, filters]
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'deep-dive', label: 'Deep Dive' },
    { key: 'insights', label: 'Insights' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F8] text-neutral-950 dark:bg-[#0A0A0B] dark:text-neutral-50 transition-colors">
      <Header
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onSyncSheet={() => syncFromSheet(false)}
        onUploadCsv={handleUploadCsv}
        onOpenSheetPicker={() => setIsSheetPickerOpen(true)}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleLogout={handleGoogleLogout}
        googleUser={googleUser}
        hasAccessToken={Boolean(accessToken)}
        isLoggingIn={isLoggingIn}
        isSyncing={isSyncing || isLoading}
        dataSource={dataSource}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {/* Compact Provenance Line on smaller screens */}
        {dataSource && (
          <div className="flex xl:hidden items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="truncate">{dataSource.label}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num shrink-0">{dataSource.rowCount} records</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num shrink-0">{dataSource.lastSyncedAt}</span>
          </div>
        )}

        {/* Clear Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-[#DC2626]/40 bg-[#FEF2F2] dark:bg-[#2A1215] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="w-5 h-5 text-[#DC2626] dark:text-[#F87171] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-xs font-bold text-[#991B1B] dark:text-[#FCA5A5]">
                  Unable to load employee dataset
                </h2>
                <p className="mt-1 text-xs text-[#7F1D1D] dark:text-[#FECACA] leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                ref={fallbackFileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadCsv(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => syncFromSheet(false)}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-[#FFC800] hover:bg-[#eab600] text-xs font-bold text-neutral-950 whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Retry Sync</span>
              </button>
              <button
                type="button"
                onClick={() => fallbackFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] text-xs font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV</span>
              </button>
              {employees.length > 0 && (
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  aria-label="Dismiss error message"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading workforce data">
            <div className="h-24 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416]"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416]" />
              <div className="h-80 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416]" />
            </div>
          </div>
        ) : employees.length === 0 ? (
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-10 text-center space-y-4">
            <h1 className="text-lg font-bold text-neutral-950 dark:text-neutral-50">
              No Employee Dataset Loaded
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
              Could not retrieve employee records from Google Sheets. Sign in with Google to read private spreadsheets, retry syncing, or upload a local CSV export.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => syncFromSheet(false)}
                className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-[#FFC800] hover:bg-[#eab600] text-xs font-bold text-neutral-950 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => fallbackFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] text-xs font-semibold text-neutral-900 dark:text-neutral-100 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV</span>
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Shared Filters Above Three Tabs */}
            <FilterBar
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(INITIAL_FILTERS)}
              options={filterOptions}
              totalCount={employees.length}
              filteredCount={filteredEmployees.length}
            />

            {/* Three Dashboard Tabs */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-1 overflow-x-auto">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative px-4 py-3 min-h-[44px] text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? 'text-neutral-950 dark:text-[#FFC800]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100'
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-[2.5px] bg-[#F58220] dark:bg-[#FFC800] rounded-t"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Tab Viewport */}
            {activeTab === 'overview' && (
              <OverviewTab employees={filteredEmployees} isDark={isDark} />
            )}

            {activeTab === 'deep-dive' && (
              <DeepDiveTab
                employees={filteredEmployees}
                isDark={isDark}
                onSelectEmployee={setSelectedEmployee}
              />
            )}

            {activeTab === 'insights' && (
              <InsightsTab
                employees={filteredEmployees}
                filters={filters}
                onClearAttritionFilter={() =>
                  setFilters((prev) => ({ ...prev, attrition: 'ALL' }))
                }
                onSelectEmployee={setSelectedEmployee}
                hasAccessToken={Boolean(accessToken)}
                onRequestExportWatchlist={(list) => setPendingExportWatchlist(list)}
                onRequestGoogleSignIn={handleGoogleSignIn}
                lastExportUrl={lastExportUrl}
              />
            )}
          </>
        )}
      </main>

      <EmployeeDrawer
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />

      <GoogleSheetsModal
        isOpen={isSheetPickerOpen}
        accessToken={accessToken}
        currentSpreadsheetId={activeSpreadsheetId}
        currentTabTitle={activeTabTitle}
        onClose={() => setIsSheetPickerOpen(false)}
        onSelectSheet={(id, tabTitle) => {
          setFilters(INITIAL_FILTERS);
          syncFromSheet(false, id, tabTitle);
        }}
        onRequireReauth={() => {
          clearAccessToken();
          setAccessToken(null);
          setErrorMessage('Your Google session expired. Sign in with Google again to browse Drive spreadsheets.');
        }}
      />

      <ConfirmExportModal
        isOpen={pendingExportWatchlist !== null}
        spreadsheetTitle={exportTitle}
        rowCount={pendingExportWatchlist?.length ?? 0}
        userEmail={googleUser?.email ?? null}
        isExporting={isExporting}
        onCancel={() => setPendingExportWatchlist(null)}
        onConfirm={handleConfirmExport}
      />
    </div>
  );
}
