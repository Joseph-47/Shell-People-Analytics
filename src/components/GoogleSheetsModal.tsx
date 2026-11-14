import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileSpreadsheet, Loader2, X } from 'lucide-react';
import {
  DriveSpreadsheetFile,
  fetchSpreadsheetMetadata,
  listDriveSpreadsheets,
  OAuthExpiredError,
  SpreadsheetTabInfo,
} from '../utils/googleSheetsApi';
import { SHEET_ID } from '../utils/csvParser';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  accessToken: string | null;
  currentSpreadsheetId: string;
  currentTabTitle: string | null;
  onClose: () => void;
  onSelectSheet: (spreadsheetId: string, tabTitle?: string) => void;
  onRequireReauth: () => void;
}

function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  accessToken,
  currentSpreadsheetId,
  currentTabTitle,
  onClose,
  onSelectSheet,
  onRequireReauth,
}) => {
  const [files, setFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>(currentSpreadsheetId);
  const [customInput, setCustomInput] = useState<string>('');
  const [tabs, setTabs] = useState<SpreadsheetTabInfo[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>(currentTabTitle ?? '');
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);

  useEffect(() => {
    if (!isOpen || !accessToken) return;
    let cancelled = false;
    setIsLoadingFiles(true);
    setError(null);
    setSelectedId(currentSpreadsheetId);

    listDriveSpreadsheets(accessToken)
      .then((list) => {
        if (!cancelled) setFiles(list);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof OAuthExpiredError) {
          onRequireReauth();
          onClose();
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not list Google Spreadsheets.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFiles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, accessToken, currentSpreadsheetId, onClose, onRequireReauth]);

  useEffect(() => {
    if (!isOpen || !accessToken || !selectedId) return;
    let cancelled = false;
    setIsLoadingTabs(true);
    setError(null);

    fetchSpreadsheetMetadata(selectedId, accessToken)
      .then((meta) => {
        if (cancelled) return;
        setTabs(meta.sheets);
        const match = meta.sheets.find((t) => t.title === currentTabTitle);
        setSelectedTab(match ? match.title : meta.sheets[0]?.title ?? '');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof OAuthExpiredError) {
          onRequireReauth();
          onClose();
          return;
        }
        setTabs([]);
        setError(err instanceof Error ? err.message : 'Unable to load worksheet tabs.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTabs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, accessToken, selectedId, currentTabTitle, onClose, onRequireReauth]);

  if (!isOpen) return null;

  const handleLoadCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractSpreadsheetId(customInput);
    if (id) {
      setSelectedId(id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Select Google Sheet"
    >
      <div
        className="w-full max-w-xl rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-neutral-950 dark:text-neutral-50">
              Select Google Spreadsheet
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Choose a spreadsheet from your Google Drive or paste any accessible Google Sheets URL.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close spreadsheet selector"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-[#DC2626]/40 bg-[#FEF2F2] dark:bg-[#2A1215] p-3 flex items-start gap-2.5 text-xs text-[#991B1B] dark:text-[#FECACA]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Paste URL / ID */}
        <form onSubmit={handleLoadCustom} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Paste Google Sheets URL or Spreadsheet ID…"
            aria-label="Google Sheets URL or Spreadsheet ID"
            className="flex-1 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
          />
          <button
            type="submit"
            className="px-3.5 py-2 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap cursor-pointer"
          >
            Load ID
          </button>
          <button
            type="button"
            onClick={() => setSelectedId(SHEET_ID)}
            className="px-3.5 py-2 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap cursor-pointer"
          >
            Default Shell Sheet
          </button>
        </form>

        {/* Drive Files List */}
        <div>
          <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
            Recent Google Spreadsheets in Drive
          </div>
          {isLoadingFiles ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading spreadsheets from Drive…</span>
            </div>
          ) : files.length === 0 ? (
            <div className="py-5 px-4 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 text-center">
              No spreadsheets listed in Drive. You can still load the default Shell UK sheet or paste a sheet URL above.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-800">
              {files.map((file) => {
                const isSelected = file.id === selectedId;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedId(file.id)}
                    className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFC800]/20 dark:bg-[#FFC800]/15 font-semibold text-neutral-950 dark:text-neutral-50'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-[#F58220] shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <span className="text-[11px] font-mono-num text-neutral-500 dark:text-neutral-400 shrink-0">
                      {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('en-GB') : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Worksheet Tab Selector */}
        <div>
          <label
            htmlFor="sheet-tab-select"
            className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5"
          >
            Worksheet Tab
          </label>
          {isLoadingTabs ? (
            <div className="flex items-center gap-2 text-xs text-neutral-500 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Reading tabs…</span>
            </div>
          ) : (
            <select
              id="sheet-tab-select"
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value)}
              disabled={tabs.length === 0}
              className="w-full min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] px-3 py-2 text-xs font-medium text-neutral-900 dark:text-neutral-100"
            >
              {tabs.map((tab) => (
                <option key={tab.sheetId} value={tab.title}>
                  {tab.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedId || tabs.length === 0 || isLoadingTabs}
            onClick={() => {
              onSelectSheet(selectedId, selectedTab || undefined);
              onClose();
            }}
            className="px-4 py-2 min-h-[40px] rounded-lg bg-[#FFC800] hover:bg-[#eab600] disabled:opacity-50 text-xs font-bold text-neutral-950 cursor-pointer"
          >
            Sync Selected Tab
          </button>
        </div>
      </div>
    </div>
  );
};
