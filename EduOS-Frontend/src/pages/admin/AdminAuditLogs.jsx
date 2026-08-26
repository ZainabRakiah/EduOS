import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAuditLogs,
  selectAdminAuditLogs,
  selectAdminLoading,
} from '@redux/slices/admin.slice.js';
import { Search, ChevronLeft, ChevronRight, History } from 'lucide-react';

export default function AdminAuditLogs() {
  const dispatch = useDispatch();
  const auditLogsState = useSelector(selectAdminAuditLogs);
  const loading = useSelector(selectAdminLoading);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  useEffect(() => {
    dispatch(fetchAuditLogs({ page, limit, search }));
  }, [dispatch, page, limit, search]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6 select-none text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-none">Administrative Audit Trail</h1>
        <p className="text-xs text-neutral-500 font-semibold mt-2">Log of all manual administrative activities and overrides.</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm max-w-md">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search logs by action or details..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse text-left">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-[10px] font-black uppercase text-neutral-450 tracking-wider">
                <th className="px-6 py-4">Admin</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target User</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-150">
              {loading.auditLogs && auditLogsState.list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto" />
                  </td>
                </tr>
              ) : auditLogsState.list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-xs font-semibold text-neutral-455">
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogsState.list.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-neutral-55/30 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-neutral-905">
                          {log.admin?.firstName} {log.admin?.lastName}
                        </div>
                        <div className="text-[10px] font-semibold text-neutral-450">{log.admin?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-neutral-600">
                        {log.targetUser ? (
                          <>
                            <div className="font-bold text-neutral-900">
                              {log.targetUser.firstName} {log.targetUser.lastName}
                            </div>
                            <div className="text-[10px] font-semibold text-neutral-450">{log.targetUser.email}</div>
                          </>
                        ) : (
                          <span className="text-neutral-400 text-xs font-semibold">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-neutral-700 leading-relaxed max-w-sm">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paging */}
        {auditLogsState.totalPages > 1 && (
          <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-4 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-450">
              Page {auditLogsState.page} of {auditLogsState.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={auditLogsState.page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-600 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:pointer-events-none shadow-3xs cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                disabled={auditLogsState.page === auditLogsState.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, auditLogsState.totalPages))}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-600 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:pointer-events-none shadow-3xs cursor-pointer"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
