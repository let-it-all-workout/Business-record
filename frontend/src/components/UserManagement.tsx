import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types';

// Get API base URL (same logic as api.ts)
const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '/api');
const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

export default function UserManagement() {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: 'staff' as UserRole,
  });

  useEffect(() => {
    if (hasPermission('users:read')) {
      loadUsers();
    }
  }, [hasPermission]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('auth_token');
      const url = `${API_BASE_URL}/auth/users`;
      console.log('[UserManagement] Loading users from:', url);
      console.log('[UserManagement] Current user:', currentUser ? { id: currentUser.id, role: currentUser.role, businessId: currentUser.businessId } : null);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('[UserManagement] Response:', {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('[UserManagement] Users loaded:', data.length, 'users');
          console.log('[UserManagement] Users data:', data);
          setUsers(data);
        } else {
          const errorText = await response.text().catch(() => '');
          console.error('[UserManagement] Invalid response format:', contentType, errorText);
          setError(`Invalid response from server: ${response.status}`);
          setUsers([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.error('[UserManagement] Failed to load users:', response.status, errorData);
        setError(errorData.error || `Failed to load users: ${response.status}`);
        setUsers([]);
      }
    } catch (error) {
      console.error('[UserManagement] Error loading users:', error);
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        setError(`Network error: Cannot connect to API server at ${API_BASE_URL}. Please check your VITE_API_URL environment variable and ensure the backend is running.`);
      } else {
        setError(error instanceof Error ? error.message : 'Failed to load users');
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      
      if (editingUser) {
        // Update user
        const response = await fetch(`${API_BASE_URL}/auth/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            role: formData.role,
          }),
        });

        if (response.ok) {
          await loadUsers();
          resetForm();
          setSuccessMessage('User updated successfully');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          setError(errorData.error || `Failed to update user: ${response.status}`);
        }
      } else {
        // Create user within existing business (use /auth/users endpoint, not /auth/register)
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          await loadUsers();
          resetForm();
          setSuccessMessage('User created successfully');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          setError(errorData.error || `Failed to create user: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        setError(`Network error: Cannot connect to API server at ${API_BASE_URL}. Please check your VITE_API_URL environment variable and ensure the backend is running.`);
      } else {
        setError(error instanceof Error ? error.message : 'Failed to save user');
      }
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      password: '',
      role: user.role,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      fullName: '',
      password: '',
      role: 'staff',
    });
    setEditingUser(null);
    setShowForm(false);
  };

  if (!hasPermission('users:read')) {
    return (
      <div className="card p-6">
        <p className="text-slate-600">You don't have permission to view users.</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">User Management</h2>
        {hasPermission('users:write') && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg space-y-4">
          <h3 className="font-semibold text-slate-900">
            {editingUser ? 'Edit User' : 'Add New User'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="input-field"
                required
                disabled={!!editingUser}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="input-field"
                required
              >
                <option value="viewer">Viewer</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  required={!editingUser}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 mt-4">
            <button 
              type="submit" 
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="btn-primary flex-1 min-w-0 whitespace-nowrap relative z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {editingUser ? 'Update User' : 'Create User'}
            </button>
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                resetForm();
              }}
              className="btn-secondary flex-1 min-w-0 whitespace-nowrap relative z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-600">Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-row">
                <th className="table-header">Username</th>
                <th className="table-header">Full Name</th>
                <th className="table-header">Email</th>
                <th className="table-header">Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="table-row">
                  <td className="table-cell">{user.username}</td>
                  <td className="table-cell">{user.fullName}</td>
                  <td className="table-cell">{user.email}</td>
                  <td className="table-cell">
                    <span className="badge badge-info">{user.role}</span>
                  </td>
                  <td className="table-cell">
                    <span className={user.isActive ? 'badge badge-success' : 'badge badge-danger'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      {hasPermission('users:write') && (
                        <button
                          onClick={() => handleEdit(user)}
                          className="btn-icon text-blue-600"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {hasPermission('users:delete') && user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="btn-icon text-red-600"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

