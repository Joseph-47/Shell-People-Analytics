import React, { useRef } from 'react';
import { User } from 'firebase/auth';
import { FolderOpen, LogOut, Moon, RefreshCw, Sun, Upload } from 'lucide-react';
import { DataSourceInfo } from '../types/employee';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onSyncSheet: () => void;
  onUploadCsv: (file: File) => void;
  onOpenSheetPicker: () => void;
  onGoogleSignIn: () => void;
  onGoogleLogout: () => void;
  googleUser: User | null;
  hasAccessToken: boolean;
  isLoggingIn: boolean;
  isSyncing: boolean;
  dataSource: DataSourceInfo | null;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
  onSyncSheet,
  onUploadCsv,
  onOpenSheetPicker,
  onGoogleSignIn,
  onGoogleLogout,
  googleUser,
  hasAccessToken,
  isLoggingIn,
  isSyncing,
  dataSource,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCsv(file);
    }
    e.target.value = '';
  };

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 min-w-0">
          <svg
            width="30"
            height="28"
            viewBox="0 0 32 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M16 2C8.2 2 2.5 7.4 2.5 14.5C2.5 18.8 5 22.1 8.6 24.1L10.3 27.5H21.7L23.4 24.1C27 22.1 29.5 18.8 29.5 14.5C29.5 7.4 23.8 2 16 2Z"
              fill="#FFC800"
              stroke="#DD1D21"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M16 4.5V24M16 24L10.2 8.2M16 24L21.8 8.2M16 24L6.2 13.5M16 24L25.8 13.5"
              stroke="#F58220"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-base sm:text-lg font-bold tracking-tight text-neutral-950 dark:text-neutral-50 whitespace-nowrap shrink-0">
            Shell People Analytics
          </span>
        </div>

        {/* Quiet Data Provenance (Desktop) */}
        {dataSource && (
          <div className="hidden xl:flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-md">
            <span className="truncate">{dataSource.label}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num shrink-0">{dataSource.rowCount} records</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num shrink-0">Synced {dataSource.lastSyncedAt}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload employee CSV file"
          />

          {!hasAccessToken ? (
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={isLoggingIn}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? 'Signing in…' : 'Sign in with Google'}
                </span>
                <span style={{ display: 'none' }}>Sign in with Google</span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenSheetPicker}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] text-xs font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#F58220] shrink-0" aria-hidden="true" />
                <span>Drive Sheets</span>
              </button>

              <button
                type="button"
                onClick={onGoogleLogout}
                title={googleUser?.email ? `Signed in as ${googleUser.email} — Sign out` : 'Sign out'}
                aria-label="Sign out of Google"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden md:inline max-w-[120px] truncate">
                  {googleUser?.email?.split('@')[0] ?? 'Sign out'}
                </span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 min-h-[40px] rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] text-xs font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Upload CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>

          <button
            type="button"
            onClick={onSyncSheet}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 min-h-[40px] rounded-lg bg-[#FFC800] hover:bg-[#eab600] active:bg-[#dfa800] disabled:opacity-60 text-xs font-bold text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-[#FFC800] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isSyncing ? 'Syncing…' : 'Sync Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F58220] transition-colors shrink-0 cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
