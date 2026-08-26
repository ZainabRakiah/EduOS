import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchUsers,
  fetchUserById,
  toggleUserStatus,
  selectAdminUsers,
  selectAdminSelectedUser,
  selectAdminLoading,
} from '@redux/slices/admin.slice.js';
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  X,
  Eye,
  Calendar,
  Sparkles,
  BookOpen,
  FolderOpen,
  ClipboardCheck,
} from 'lucide-react';
import { clearSelectedUser } from '../../redux/slices/admin.slice.js';

export default function AdminUsers() {
  const dispatch = useDispatch();
  const usersState = useSelector(selectAdminUsers);
  const selectedUser = useSelector(selectAdminSelectedUser);
  const loading = useSelector(selectAdminLoading);

  // Filter and pagination state
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Modals / dialogs state
  const [confirmBlockUser, setConfirmBlockUser] = useState(null); // { id, name, currentStatus }
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    dispatch(
      fetchUsers({
        page,
        limit,
        search,
        role,
        plan,
        status,
        subscriptionStatus,
        classFilter,
      })
    );
  }, [dispatch, page, limit, search, role, plan, status, subscriptionStatus, classFilter]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset page on query
  };

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const handleToggleStatus = async () => {
    if (!confirmBlockUser) return;
    const nextStatus = confirmBlockUser.currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await dispatch(toggleUserStatus({ id: confirmBlockUser.id, status: nextStatus }));
    setConfirmBlockUser(null);
  };

  const handleOpenDetails = async (id) => {
    await dispatch(fetchUserById(id));
    setDetailModalOpen(true);
  };

  const handleCloseDetails = () => {
    dispatch(clearSelectedUser());
    setDetailModalOpen(false);
  };

  const CLASSES = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  return (
    <div className="space-y-6 select-none text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-none">User Management</h1>
        <p className="text-xs text-neutral-500 font-semibold mt-2">Manage student permissions, active roles, and soft block states.</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500">
              <SlidersHorizontal className="h-4 w-4" /> Filters:
            </div>
            
            {/* Plan Filter */}
            <select
              value={plan}
              onChange={(e) => handleFilterChange(setPlan, e.target.value)}
              className="px-3 py-1.5 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
            >
              <option value="">All Plans</option>
              <option value="FREE">Free Plan</option>
              <option value="PREMIUM">Premium Plan</option>
            </select>

            {/* Sub Status Filter */}
            <select
              value={subscriptionStatus}
              onChange={(e) => handleFilterChange(setSubscriptionStatus, e.target.value)}
              className="px-3 py-1.5 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
            >
              <option value="">All Subscription Status</option>
              <option value="ACTIVE">Subscription Active</option>
              <option value="EXPIRED">Subscription Expired</option>
              <option value="CANCELLED">Subscription Cancelled</option>
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="px-3 py-1.5 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
            >
              <option value="">All Account Status</option>
              <option value="ACTIVE">Active Account</option>
              <option value="INACTIVE">Deactivated (Blocked)</option>
            </select>

            {/* Class Filter */}
            <select
              value={classFilter}
              onChange={(e) => handleFilterChange(setClassFilter, e.target.value)}
              className="px-3 py-1.5 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
            >
              <option value="">All Grades</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-[10px] font-black uppercase text-neutral-450 tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Sub Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-150">
              {loading.users && usersState.list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto" />
                  </td>
                </tr>
              ) : usersState.list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-xs font-semibold text-neutral-450">
                    No users matching selected filters.
                  </td>
                </tr>
              ) : (
                usersState.list.map((u) => {
                  const sub = u.subscription;
                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/50 transition">
                      <td className="px-6 py-4 font-bold text-neutral-900">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-500">{u.email}</td>
                      <td className="px-6 py-4 font-semibold text-neutral-600">{u.className || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub?.plan === 'PREMIUM' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {sub?.plan === 'PREMIUM' && <Sparkles className="h-2.5 w-2.5" />}
                          {sub?.plan || 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {sub ? (
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            sub.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {sub.status}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-xs font-semibold">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-500">
                        {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-danger-500/10 text-danger-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-danger-500'}`} />
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetails(u.id)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-neutral-250 bg-white hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700 shadow-2xs cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmBlockUser({ id: u.id, name: `${u.firstName} ${u.lastName}`, currentStatus: u.status })}
                          className={`inline-flex items-center justify-center p-1.5 rounded-lg border shadow-2xs cursor-pointer ${
                            u.status === 'ACTIVE'
                              ? 'border-danger-200 bg-white hover:bg-danger-50 text-danger-600'
                              : 'border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-600'
                          }`}
                          title={u.status === 'ACTIVE' ? 'Block User' : 'Unblock User'}
                        >
                          {u.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {usersState.totalPages > 1 && (
          <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-4 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-450">
              Page {usersState.page} of {usersState.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={usersState.page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-600 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:pointer-events-none shadow-3xs cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                disabled={usersState.page === usersState.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, usersState.totalPages))}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-600 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:pointer-events-none shadow-3xs cursor-pointer"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Drawer Modal */}
      {detailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay backdrop */}
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={handleCloseDetails} />
          
          {/* Drawer container */}
          <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">User Profile Insights</h3>
                <p className="text-[10px] text-neutral-450 font-bold uppercase mt-0.5">UID: {selectedUser.profile.id}</p>
              </div>
              <button
                onClick={handleCloseDetails}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-450 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile card summary */}
              <div className="flex gap-4 items-center bg-neutral-50 border border-neutral-200/50 p-4 rounded-2xl">
                <div className="h-12 w-12 rounded-xl bg-brand-500 flex items-center justify-center text-white text-lg font-black shadow-sm">
                  {selectedUser.profile.firstName[0]}
                  {selectedUser.profile.lastName[0]}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-extrabold text-neutral-900">
                    {selectedUser.profile.firstName} {selectedUser.profile.lastName}
                  </h4>
                  <p className="text-xs text-neutral-500 font-semibold">{selectedUser.profile.email}</p>
                </div>
              </div>

              {/* Account properties */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50/50 border border-neutral-150 p-3.5 rounded-xl space-y-1">
                  <span className="text-[9px] font-black text-neutral-450 uppercase block">Grade Level</span>
                  <span className="text-xs font-extrabold text-neutral-700">{selectedUser.profile.className || 'N/A'}</span>
                </div>
                <div className="bg-neutral-50/50 border border-neutral-150 p-3.5 rounded-xl space-y-1">
                  <span className="text-[9px] font-black text-neutral-450 uppercase block">Account Status</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedUser.profile.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-danger-50 text-danger-700'
                  }`}>
                    {selectedUser.profile.status}
                  </span>
                </div>
              </div>

              {/* Subscriptions properties */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-neutral-450 tracking-wider">Subscription Entitlements</h4>
                <div className="border border-neutral-200 rounded-xl p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500">Plan Status:</span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedUser.profile.subscription?.plan === 'PREMIUM' ? 'bg-blue-50 text-blue-700' : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {selectedUser.profile.subscription?.plan || 'FREE'}
                    </span>
                  </div>
                  {selectedUser.profile.subscription?.endDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-500">Valid Until:</span>
                      <span className="text-xs font-bold text-neutral-700">
                        {new Date(selectedUser.profile.subscription.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage Aggregates */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-neutral-450 tracking-wider">Usage Statistics</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-neutral-200 rounded-xl p-3 text-center space-y-1">
                    <Sparkles className="h-4 w-4 mx-auto text-brand-500" />
                    <span className="text-[9px] font-black text-neutral-400 uppercase block">AI Requests</span>
                    <span className="text-base font-extrabold text-neutral-800">{selectedUser.stats.aiUsageTotal}</span>
                  </div>
                  <div className="border border-neutral-200 rounded-xl p-3 text-center space-y-1">
                    <ClipboardCheck className="h-4 w-4 mx-auto text-emerald-500" />
                    <span className="text-[9px] font-black text-neutral-400 uppercase block">Mock Tests</span>
                    <span className="text-base font-extrabold text-neutral-800">{selectedUser.stats.mockAttemptCount}</span>
                  </div>
                  <div className="border border-neutral-200 rounded-xl p-3 text-center space-y-1">
                    <BookOpen className="h-4 w-4 mx-auto text-amber-500" />
                    <span className="text-[9px] font-black text-neutral-400 uppercase block">Notes</span>
                    <span className="text-base font-extrabold text-neutral-800">{selectedUser.stats.notesCount}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Log */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-neutral-450 tracking-wider">Recent Learning Log</h4>
                <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 max-h-48 overflow-y-auto">
                  {selectedUser.recentActivities.length === 0 ? (
                    <div className="p-4 text-center text-xs font-bold text-neutral-400">
                      No learning events recorded yet.
                    </div>
                  ) : (
                    selectedUser.recentActivities.map((act) => (
                      <div key={act.id} className="p-3 text-xs flex justify-between items-center gap-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-neutral-800 block">{act.title}</span>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">
                            {act.entityType} • {act.type}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-450 shrink-0">
                          {new Date(act.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-200 px-6 py-4 bg-neutral-50/50">
              <Button variant="outline" className="w-full text-xs font-bold h-10" onClick={handleCloseDetails}>
                Dismiss Panel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Soft Block Dialog */}
      {confirmBlockUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={() => setConfirmBlockUser(null)} />
          <div className="relative bg-white rounded-3xl border border-neutral-200/60 shadow-xl max-w-sm w-full p-6 space-y-6 animate-in zoom-in-95 duration-150">
            <div className="space-y-2 text-center">
              <h3 className="text-base font-extrabold text-neutral-900">
                {confirmBlockUser.currentStatus === 'ACTIVE' ? 'Deactivate User?' : 'Activate User?'}
              </h3>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Are you sure you want to {confirmBlockUser.currentStatus === 'ACTIVE' ? 'deactivate' : 'activate'}{' '}
                <span className="font-bold text-neutral-900">{confirmBlockUser.name}</span>?
                {confirmBlockUser.currentStatus === 'ACTIVE' && ' They will be immediately blocked from logging into the platform.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmBlockUser(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-neutral-300 hover:bg-neutral-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white transition cursor-pointer ${
                  confirmBlockUser.currentStatus === 'ACTIVE'
                    ? 'bg-danger-600 hover:bg-danger-700 shadow-md shadow-danger-500/10'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10'
                }`}
              >
                {confirmBlockUser.currentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Button({ children, className, variant = 'solid', ...props }) {
  const styles =
    variant === 'solid'
      ? 'bg-neutral-900 hover:bg-neutral-850 text-white shadow-md'
      : 'bg-white hover:bg-neutral-50 border border-neutral-350 text-neutral-700';

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition active:scale-[0.99] cursor-pointer ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
