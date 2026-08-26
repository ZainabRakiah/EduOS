import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSubscriptions,
  updateSubscription,
  selectAdminSubscriptions,
  selectAdminLoading,
} from '@redux/slices/admin.slice.js';
import {
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Calendar,
  XCircle,
  Ban,
  Clock,
} from 'lucide-react';

export default function AdminSubscriptions() {
  const dispatch = useDispatch();
  const subState = useSelector(selectAdminSubscriptions);
  const loading = useSelector(selectAdminLoading);

  // Filters & paging
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Override Form states
  const [overrideModal, setOverrideModal] = useState(null); // { userId, userName, action: 'GRANT'|'EXTEND'|'EXPIRE'|'CANCEL', currentPlan, currentStatus }
  const [selectedPlan, setSelectedPlan] = useState('PREMIUM');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [validityMonths, setValidityMonths] = useState('1'); // "1", "12", "unlimited", "custom"
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    dispatch(fetchSubscriptions({ page, limit, plan, status }));
  }, [dispatch, page, limit, plan, status]);

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const handleOpenOverride = (subObj, action) => {
    const user = subObj.user;
    setOverrideModal({
      userId: subObj.userId,
      userName: `${user.firstName} ${user.lastName}`,
      action,
      currentPlan: subObj.plan,
      currentStatus: subObj.status,
    });
    
    // Set matching defaults
    if (action === 'GRANT') {
      setSelectedPlan('PREMIUM');
      setSelectedStatus('ACTIVE');
      setValidityMonths('1');
    } else if (action === 'EXTEND') {
      setSelectedPlan(subObj.plan);
      setSelectedStatus('ACTIVE');
      setValidityMonths('1');
    } else if (action === 'EXPIRE') {
      setSelectedPlan(subObj.plan);
      setSelectedStatus('EXPIRED');
    } else if (action === 'CANCEL') {
      setSelectedPlan('FREE');
      setSelectedStatus('CANCELLED');
    }
  };

  const handleSaveOverride = async () => {
    if (!overrideModal) return;

    let targetPlan = selectedPlan;
    let targetStatus = selectedStatus;
    let computedEndDate = null;

    if (overrideModal.action === 'EXPIRE') {
      targetStatus = 'EXPIRED';
      computedEndDate = new Date();
    } else if (overrideModal.action === 'CANCEL') {
      targetPlan = 'FREE';
      targetStatus = 'CANCELLED';
      computedEndDate = new Date();
    } else {
      // For Grant and Extend
      if (validityMonths === '1') {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        computedEndDate = d.toISOString();
      } else if (validityMonths === '12') {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        computedEndDate = d.toISOString();
      } else if (validityMonths === 'custom') {
        if (!customDate) {
          alert('Please specify a custom expiry date.');
          return;
        }
        computedEndDate = new Date(customDate).toISOString();
      } else {
        computedEndDate = null; // Unlimited
      }
    }

    await dispatch(
      updateSubscription({
        userId: overrideModal.userId,
        plan: targetPlan,
        status: targetStatus,
        endDate: computedEndDate,
      })
    );

    setOverrideModal(null);
    dispatch(fetchSubscriptions({ page, limit, plan, status }));
  };

  return (
    <div className="space-y-6 select-none text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-none">Subscription Entitlements</h1>
        <p className="text-xs text-neutral-500 font-semibold mt-2">Manage student plan statuses and manual administrative updates.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 items-center">
          <span className="text-xs font-bold text-neutral-500">Plan:</span>
          <select
            value={plan}
            onChange={(e) => handleFilterChange(setPlan, e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
          >
            <option value="">All plans</option>
            <option value="FREE">Free Plan</option>
            <option value="PREMIUM">Premium Plan</option>
          </select>

          <span className="text-xs font-bold text-neutral-500">Status:</span>
          <select
            value={status}
            onChange={(e) => handleFilterChange(setStatus, e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse text-left">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-[10px] font-black uppercase text-neutral-450 tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Start Date</th>
                <th className="px-6 py-4">End Date</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-150">
              {loading.subscriptions && subState.list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto" />
                  </td>
                </tr>
              ) : subState.list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs font-semibold text-neutral-455">
                    No subscriptions matching selected filters.
                  </td>
                </tr>
              ) : (
                subState.list.map((sub) => {
                  return (
                    <tr key={sub.id} className="hover:bg-neutral-55/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-neutral-905">
                          {sub.user?.firstName} {sub.user?.lastName}
                        </div>
                        <div className="text-[10px] font-semibold text-neutral-450">{sub.user?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.plan === 'PREMIUM' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {sub.plan === 'PREMIUM' && <Sparkles className="h-2.5 w-2.5" />}
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          sub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sub.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-500">
                        {new Date(sub.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-neutral-600">
                        {sub.endDate 
                          ? new Date(sub.endDate).toLocaleDateString()
                          : 'Unlimited / Forever'
                        }
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-500">
                        {new Date(sub.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        {sub.plan === 'FREE' ? (
                          <button
                            onClick={() => handleOpenOverride(sub, 'GRANT')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-200 bg-white hover:bg-brand-50 text-xs font-bold text-brand-700 cursor-pointer shadow-3xs"
                          >
                            <PlusCircle className="h-3.5 w-3.5" /> Grant Pro
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenOverride(sub, 'EXTEND')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 cursor-pointer shadow-3xs"
                            >
                              <Clock className="h-3.5 w-3.5 text-neutral-500" /> Extend
                            </button>
                            <button
                              onClick={() => handleOpenOverride(sub, 'EXPIRE')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-xs font-bold text-amber-750 cursor-pointer shadow-3xs"
                            >
                              <Ban className="h-3.5 w-3.5" /> Expire
                            </button>
                            <button
                              onClick={() => handleOpenOverride(sub, 'CANCEL')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger-200 bg-white hover:bg-danger-50 text-xs font-bold text-danger-700 cursor-pointer shadow-3xs"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paging */}
        {subState.totalPages > 1 && (
          <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-4 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-450">
              Page {subState.page} of {subState.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={subState.page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-600 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:pointer-events-none shadow-3xs cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                disabled={subState.page === subState.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, subState.totalPages))}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-600 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:pointer-events-none shadow-3xs cursor-pointer"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Override Dialog Form */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={() => setOverrideModal(null)} />
          <div className="relative bg-white rounded-3xl border border-neutral-200/60 shadow-2xl max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-150 text-left">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-neutral-900">
                {overrideModal.action} Subscription
              </h3>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Confirming manual override actions for: <span className="font-bold text-neutral-900">{overrideModal.userName}</span>.
              </p>
            </div>

            {/* Grant / Extend specifics */}
            {(overrideModal.action === 'GRANT' || overrideModal.action === 'EXTEND') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-450 uppercase">Plan</label>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
                    >
                      <option value="FREE">Free</option>
                      <option value="PREMIUM">Premium</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-450 uppercase">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-450 uppercase block">Validity Duration</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: '1', label: '1 Month' },
                      { val: '12', label: '1 Year' },
                      { val: 'unlimited', label: 'Unlimited' },
                      { val: 'custom', label: 'Custom Date' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setValidityMonths(item.val)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                          validityMonths === item.val
                            ? 'border-brand-500 bg-brand-50/50 text-brand-700 ring-2 ring-brand-500/10'
                            : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {validityMonths === 'custom' && (
                  <div className="space-y-1 animate-in slide-in-from-top duration-150">
                    <label className="text-[10px] font-black text-neutral-450 uppercase block">Select Expiration Date</label>
                    <input
                      type="date"
                      value={customDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Expire / Cancel warnings */}
            {overrideModal.action === 'EXPIRE' && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-xs leading-relaxed font-semibold">
                ⚠️ Warning: Expiring this user's subscription will revoke their premium active indicator immediately. All mock attempt access locks will apply.
              </div>
            )}
            {overrideModal.action === 'CANCEL' && (
              <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 rounded-2xl text-xs leading-relaxed font-semibold">
                ⚠️ Warning: Cancelling this subscription will immediately downgrade the user's plan to Free, applying active gates for premium modules.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setOverrideModal(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-neutral-300 hover:bg-neutral-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverride}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-850 transition cursor-pointer shadow-md"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
