import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface BackupInfo {
  filename: string;
  date: string;
  size: string;
}

export default function BackupManager() {
  const { isSuperAdmin } = useAuth();
  
  // Only show to super admin
  if (!isSuperAdmin) {
    return null;
  }
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/backup');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const backupList = await response.json();
          setBackups(backupList);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        // Fallback to localStorage if API fails
        const stored = localStorage.getItem('backup-list') || '[]';
        try {
          const backupList = stored ? JSON.parse(stored) : [];
          setBackups(backupList);
        } catch (parseError) {
          console.error('Error parsing backup list:', parseError);
          setBackups([]);
        }
      }
    } catch (error) {
      console.error('Error loading backups:', error);
      // Fallback to localStorage if API fails
      try {
        const stored = localStorage.getItem('backup-list') || '[]';
        const backupList = stored ? JSON.parse(stored) : [];
        setBackups(backupList);
      } catch (parseError) {
        console.error('Error parsing backup list from localStorage:', parseError);
        setBackups([]);
      }
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Call backup API
      const response = await fetch('/api/backup', { method: 'POST' });
      if (response.ok) {
        // Reload backups from API
        await loadBackups();
        
        alert('Backup created successfully!');
      } else {
        throw new Error('Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Failed to create backup. Please ensure the server is running.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to restore from ${filename}? This will replace all current data.`)) {
      return;
    }

    setIsRestoring(true);
    try {
      const response = await fetch(`/api/backup/restore?file=${encodeURIComponent(filename)}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        alert('Backup restored successfully! The page will reload.');
        window.location.reload();
      } else {
        throw new Error('Failed to restore backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Failed to restore backup. Please ensure the server is running.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/backup/download?file=${encodeURIComponent(filename)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download backup');
      }
    } catch (error) {
      console.error('Error downloading backup:', error);
      alert('Failed to download backup.');
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!window.confirm(`Delete backup ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/backup?file=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadBackups();
        alert('Backup deleted successfully!');
      } else {
        throw new Error('Failed to delete backup');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('Failed to delete backup.');
    }
  };

  const handleExportData = () => {
    // Export all data as JSON
    const exportData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      // This would include all data from the database
      note: 'Use the backup API endpoint for complete database backups',
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `business-record-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        JSON.parse(text); // Validate JSON
        
        if (window.confirm('Import this data? This may overwrite existing data.')) {
          // This would call an import API
          alert('Import functionality requires API endpoint implementation.');
        }
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Failed to import data. Invalid file format.');
      }
    };
    input.click();
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Backup & Data Management</h2>
        <button
          onClick={handleCreateBackup}
          disabled={isCreatingBackup}
          className="btn-primary"
        >
          {isCreatingBackup ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Create Backup
            </>
          )}
        </button>
      </div>

      {/* Backup List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Available Backups</h3>
        {backups.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No backups found. Create your first backup to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{backup.filename}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(backup.date).toLocaleString()} • {backup.size}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadBackup(backup.filename)}
                    className="btn-icon"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRestoreBackup(backup.filename)}
                    disabled={isRestoring}
                    className="btn-icon text-blue-600"
                    title="Restore"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(backup.filename)}
                    className="btn-icon text-red-600"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import/Export */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Data Import/Export</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleExportData}
            className="btn-secondary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Data (JSON)
          </button>
          <button
            onClick={handleImportData}
            className="btn-secondary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import Data (JSON)
          </button>
        </div>
      </div>

      {/* Auto Backup Settings */}
      <div className="border-t border-slate-200 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Auto Backup Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-slate-700">Enable automatic daily backups</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-slate-700">Backup before major operations (sales, refunds)</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Keep backups for</label>
            <select className="w-full md:w-48 px-3 py-2 border border-slate-300 rounded-lg">
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

