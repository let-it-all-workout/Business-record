import { useState, useEffect } from 'react';
import { Business } from '../types';

// Get API base URL
const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '/api');
const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

interface BusinessWithStats extends Business {
  owner_username?: string;
  owner_email?: string;
  owner_name?: string;
  user_count?: number;
}

interface SuperAdminPanelProps {
  onSelectBusiness: (businessId: string) => void;
  selectedBusinessId?: string | null;
  showBusinessList?: boolean;
}

export default function SuperAdminPanel({ 
  onSelectBusiness, 
  selectedBusinessId: propSelectedBusinessId,
  showBusinessList = true 
}: SuperAdminPanelProps) {
  const [businesses, setBusinesses] = useState<BusinessWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    propSelectedBusinessId || localStorage.getItem('selected_business_id')
  );

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (propSelectedBusinessId !== undefined) {
      setSelectedBusinessId(propSelectedBusinessId);
    }
  }, [propSelectedBusinessId]);

  const loadBusinesses = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const loadUrl = `${API_BASE_URL}/auth/businesses`;
      const response = await fetch(loadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setBusinesses(data);
        } else {
          setError('Invalid response from server');
        }
      } else {
        const errorText = await response.text().catch(() => '');
        setError(`Failed to load businesses: ${response.status} ${errorText.substring(0, 100)}`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) {
        console.error('[SuperAdminPanel] Error:', err);
      }
      setError(`Error loading businesses: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusiness = (businessId: string) => {
    setSelectedBusinessId(businessId);
    localStorage.setItem('selected_business_id', businessId);
    onSelectBusiness(businessId);
  };

  const handleClearSelection = () => {
    setSelectedBusinessId(null);
    localStorage.removeItem('selected_business_id');
    onSelectBusiness('');
  };

  if (loading) {
    return (
      <div className="card p-6">
        <p className="text-slate-600">Loading businesses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!showBusinessList && selectedBusinessId) {
    // If business is selected and we shouldn't show list, return null (business details will be shown in main app)
    return null;
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Select a Business</h2>
          <p className="text-sm text-slate-600 mt-1">Click on a business to view its details and provide support</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedBusinessId && (
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            >
              View All
            </button>
          )}
          <div className="badge badge-info">Super Admin</div>
        </div>
      </div>

      {businesses.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-600">No businesses found</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((business) => (
              <div
                key={business.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedBusinessId === business.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => handleSelectBusiness(business.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">{business.name}</h3>
                  {selectedBusinessId === business.id && (
                    <span className="badge badge-success text-xs">Active</span>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-slate-600">
                  {business.owner_name && (
                    <p>
                      <span className="font-medium">Owner:</span> {business.owner_name}
                    </p>
                  )}
                  {business.owner_email && (
                    <p>
                      <span className="font-medium">Email:</span> {business.owner_email}
                    </p>
                  )}
                  {business.user_count !== undefined && (
                    <p>
                      <span className="font-medium">Users:</span> {business.user_count}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Created: {new Date(business.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {selectedBusinessId && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800 font-semibold">
                    Viewing: {businesses.find(b => b.id === selectedBusinessId)?.name}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    All data below is now filtered for this business. Use this to help clients with issues.
                  </p>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Switch Business
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

