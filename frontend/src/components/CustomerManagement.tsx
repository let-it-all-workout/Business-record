import { useState } from 'react';
import { Customer } from '../types';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import PINVerification from './PINVerification';

interface CustomerManagementProps {
  customers: Customer[];
  onAdd: (customer: Omit<Customer, 'id' | 'totalPurchases' | 'totalSpent' | 'createdAt'>) => void;
  onEdit: (id: string, customer: Partial<Customer>) => void;
  onDelete: (id: string) => void;
  globalCurrency: string;
}

export default function CustomerManagement({
  customers,
  onAdd,
  onEdit,
  onDelete,
  globalCurrency,
}: CustomerManagementProps) {
  const { user } = useAuth();
  const isBusinessAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [showPINVerification, setShowPINVerification] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pinError, setPinError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      onEdit(editingCustomer.id, formData);
    } else {
      onAdd(formData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
    setEditingCustomer(null);
    setIsFormOpen(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setIsFormOpen(true);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Customer Management</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Customer
        </button>
      </div>

      {isFormOpen && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingCustomer ? 'Update' : 'Add'} Customer
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {customers.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p>No customers yet. Add your first customer to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Contact</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Purchases</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Total Spent</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Last Purchase</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{customer.name}</div>
                    {customer.notes && (
                      <div className="text-xs text-slate-500 mt-1">{customer.notes}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {customer.email && <div>{customer.email}</div>}
                    {customer.phone && <div>{customer.phone}</div>}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{customer.totalPurchases}</td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {formatCurrency(customer.totalSpent, globalCurrency)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {customer.lastPurchaseDate
                      ? new Date(customer.lastPurchaseDate).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isBusinessAdmin && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setPendingAction(() => () => handleEdit(customer));
                            setShowPINVerification(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${customer.name}?`)) {
                              setPendingAction(() => () => onDelete(customer.id));
                              setShowPINVerification(true);
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PINVerification
        isOpen={showPINVerification}
        onClose={() => {
          setShowPINVerification(false);
          setPendingAction(null);
          setPinError('');
        }}
        onVerify={async (pin) => {
          try {
            const token = localStorage.getItem('auth_token');
            const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '/api');
            const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
            
            const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ pin }),
            });

            if (response.ok) {
              setShowPINVerification(false);
              setPinError('');
              if (pendingAction) {
                pendingAction();
                setPendingAction(null);
              }
            } else {
              const error = await response.json().catch(() => ({ error: 'AUTH-005: PIN verification failed' }));
              setPinError(error.error || 'AUTH-005: PIN verification failed');
            }
          } catch (error) {
            console.error('PIN verification error:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
              setPinError('NET-001: Error: try again later');
            } else {
              setPinError('AUTH-005: PIN verification failed');
            }
          }
        }}
        title="Enter PIN to Continue"
        message="Please enter your PIN to perform this action"
        error={pinError}
      />
    </div>
  );
}

