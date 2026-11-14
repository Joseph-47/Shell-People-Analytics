import React from 'react';
import { FileSpreadsheet, Loader2, X } from 'lucide-react';

interface ConfirmExportModalProps {
  isOpen: boolean;
  spreadsheetTitle: string;
  rowCount: number;
  userEmail: string | null;
  isExporting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmExportModal: React.FC<ConfirmExportModalProps> = ({
  isOpen,
  spreadsheetTitle,
  rowCount,
  userEmail,
  isExporting,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={isExporting ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm Google Sheets export"
    >
      <div
        className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#F58220] shrink-0" aria-hidden="true" />
            <h2 className="text-base font-bold text-neutral-950 dark:text-neutral-50">
              Create Google Sheet in Drive?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isExporting}
            aria-label="Cancel export"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
          This will create a new Google Spreadsheet in your Google Drive{userEmail ? ` (${userEmail})` : ''} and write the currently filtered Top-{rowCount} Flight-Risk Watchlist rows into a tab named <span className="font-semibold text-neutral-900 dark:text-neutral-100">Flight-Risk Watchlist</span>.
        </p>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#19191C] p-3 text-xs space-y-1">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">New file title: </span>
            <span className="font-semibold text-neutral-950 dark:text-neutral-50">
              {spreadsheetTitle}
            </span>
          </div>
          <div className="font-mono-num">
            <span className="text-neutral-500 dark:text-neutral-400">Records to write: </span>
            <span className="font-semibold text-neutral-950 dark:text-neutral-50">
              {rowCount} employees + 1 header row
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExporting}
            className="px-4 py-2 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-[#FFC800] hover:bg-[#eab600] disabled:opacity-60 text-xs font-bold text-neutral-950 cursor-pointer"
          >
            {isExporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isExporting ? 'Creating Sheet…' : 'Confirm & Create Sheet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
