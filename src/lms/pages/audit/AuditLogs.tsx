import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, Spinner, EmptyState, Badge } from '../../components/ui';
import { formatDateTime, fullName } from '../../lib/utils';
import type { AuditLog } from '../../types';

export default function AuditLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get<{ data: { logs: AuditLog[] } }>('/settings/audit-logs').then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500 text-sm mt-1">System activity log</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon={<FileText size={40} />} title="No audit logs" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  {['When', 'User', 'Action', 'Resource'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">
                      {log.user ? fullName(log.user) : <span className="text-slate-400">System</span>}
                    </td>
                    <td className="px-6 py-3"><Badge variant="default">{log.action}</Badge></td>
                    <td className="px-6 py-3 text-sm text-slate-500">{log.resource} {log.resourceId ? `#${log.resourceId.slice(0, 8)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
