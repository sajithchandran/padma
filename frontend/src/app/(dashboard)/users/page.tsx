'use client';

import { useState } from 'react';
import { Search, Plus, Shield, UserPlus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { MOCK_TEAM } from '@/lib/mock-data';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-violet-50 text-violet-700 ring-violet-200',
  care_coordinator: 'bg-blue-50 text-blue-700 ring-blue-200',
  physician: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  nurse: 'bg-teal-50 text-teal-700 ring-teal-200',
  supervisor: 'bg-amber-50 text-amber-700 ring-amber-200',
  viewer: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const SYSTEM_ROLES = [
  { code: 'admin', name: 'Administrator', permissions: 23, desc: 'Full system access including tenant management' },
  { code: 'supervisor', name: 'Supervisor', permissions: 20, desc: 'All clinical operations, no tenant management' },
  { code: 'care_coordinator', name: 'Care Coordinator', permissions: 14, desc: 'Task, enrollment, patient PII and communications' },
  { code: 'physician', name: 'Physician', permissions: 10, desc: 'Clinical pathway and patient data access' },
  { code: 'nurse', name: 'Nurse', permissions: 8, desc: 'Task execution and patient care operations' },
  { code: 'viewer', name: 'Viewer', permissions: 4, desc: 'Read-only access across all modules' },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'team' | 'roles'>('team');

  const filtered = MOCK_TEAM.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['team', 'roles'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'team' ? 'Team Members' : 'Roles & Permissions'}
          </button>
        ))}
      </div>

      {tab === 'team' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input placeholder="Search team members…" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
            </div>
            <Button icon={<UserPlus className="h-4 w-4" />}>Invite User</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((u) => (
              <Card key={u.id} hover className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <Avatar name={u.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${ROLE_COLORS[u.roleCode] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                        <Shield className="h-3 w-3" />
                        {u.role}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={u.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{u.patientsAssigned}</p>
                    <p className="text-[10px] text-slate-500">Patients</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${u.tasksOpen > 5 ? 'text-amber-600' : 'text-slate-900'}`}>{u.tasksOpen}</p>
                    <p className="text-[10px] text-slate-500">Open Tasks</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Active {u.lastActive}</p>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="xs">Edit</Button>
                    <Button variant="ghost" size="xs">Assign</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {SYSTEM_ROLES.length} system roles configured with granular permission control.
            </p>
            <Button icon={<Plus className="h-4 w-4" />} variant="outline">Custom Role</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SYSTEM_ROLES.map((role) => (
              <Card key={role.code} hover className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <h3 className="font-semibold text-slate-900">{role.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500">{role.desc}</p>
                  </div>
                  <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${ROLE_COLORS[role.code] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                    {role.code}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex-1 w-32">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(role.permissions / 23) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{role.permissions}/23 permissions</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="xs">Edit</Button>
                    <Button variant="ghost" size="xs">Clone</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
