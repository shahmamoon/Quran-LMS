import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Video } from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Card, CardHeader, CardBody, Input, Spinner } from '../../components/ui';
import { toast } from 'sonner';

interface Setting { key: string; value: string; isPublic: boolean }

export default function Settings() {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ data: Setting[] }>('/settings').then((r) => r.data.data),
  });

  useEffect(() => {
    if (settings.length) {
      setValues(Object.fromEntries(settings.map((s) => [s.key, s.value])));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) => api.put('/settings', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); qc.invalidateQueries({ queryKey: ['settings-public'] }); toast.success('Settings saved'); },
    onError: () => toast.error('Failed to save settings'),
  });

  const SETTING_LABELS: Record<string, { label: string; description: string }> = {
    recording_upload_enabled: {
      label: 'Session Recording Upload',
      description: 'Allow teachers and admins to upload MP4 recordings for completed sessions.',
    },
  };

  // Other settings = everything except meeting_provider (rendered separately)
  const otherSettings = settings.filter((s) => s.key !== 'meeting_provider');

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure global platform settings</p>
        </div>
        <Button icon={<Save size={16} />} onClick={() => saveMutation.mutate(values)} loading={saveMutation.isPending}>Save Changes</Button>
      </div>

      {/* ── Meeting Provider ─────────────────────────────────── */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Video size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Meeting Platform</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-500 mb-4">Choose which platform is used to generate meeting links when creating sessions. Only one can be active at a time.</p>
          <div className="flex gap-3 flex-wrap">
            {([
              { key: 'zoom',        label: 'Zoom',        icon: '🎬' },
              { key: 'google_meet', label: 'Google Meet', icon: '📅' },
              { key: 'daily_co',   label: 'Daily.co',    icon: '🔴' },
            ] as const).map(({ key: provider, label, icon }) => {
              const isSelected = (values['meeting_provider'] ?? 'zoom') === provider;
              return (
                <button
                  key={provider}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, meeting_provider: provider }))}
                  className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <span className="mr-1.5">{icon}</span>{label}
                  {isSelected && <span className="ml-2 text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded-full">Active</span>}
                </button>
              );
            })}
          </div>
          {(values['meeting_provider'] ?? 'zoom') === 'daily_co' && (
            <p className="text-xs text-slate-500 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <strong>Daily.co</strong> auto-records every session to cloud storage and uploads the MP4 to R2 when done. Requires <code>DAILY_API_KEY</code> in the server environment. Set the Daily.co dashboard webhook to <code>POST /api/daily/webhook</code>.
            </p>
          )}
        </CardBody>
      </Card>

      {/* ── Other Settings ───────────────────────────────────── */}
      {otherSettings.length > 0 && (
        <Card>
          <CardHeader><h2 className="font-semibold text-slate-800">General</h2></CardHeader>
          <CardBody className="space-y-4">
            {otherSettings.map((s) => (
              <div key={s.key}>
                {s.value === 'true' || s.value === 'false' ? (
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{SETTING_LABELS[s.key]?.label ?? s.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                      <p className="text-xs text-slate-400">{SETTING_LABELS[s.key]?.description ?? (s.isPublic ? 'Publicly visible' : 'Internal setting')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setValues((v) => ({ ...v, [s.key]: v[s.key] === 'true' ? 'false' : 'true' }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${values[s.key] === 'true' ? 'bg-brand-500' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${values[s.key] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </label>
                ) : (
                  <Input
                    label={s.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    value={values[s.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                    helper={s.isPublic ? 'Publicly visible' : undefined}
                  />
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
