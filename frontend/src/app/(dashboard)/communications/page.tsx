'use client';

import { useState } from 'react';
import { Send, Inbox, MessageSquare, Phone, Mail, Clock, CheckCircle2, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { MOCK_PATIENTS } from '@/lib/mock-data';

const INBOX = [
  { id: 'm1', from: 'Ahmed Al-Rashidi', type: 'SMS', message: 'Doctor, I have been feeling dizzy since I changed my medication yesterday. Should I stop?', time: '09:14', unread: true, priority: 'HIGH' },
  { id: 'm2', from: 'Fatima Al-Zaabi', type: 'Portal', message: 'I have completed my daily symptom log for the week. Also my peak flow is improving!', time: '08:50', unread: true, priority: 'NORMAL' },
  { id: 'm3', from: 'Aisha Mohammed', type: 'SMS', message: 'Weight this morning: 72.4 kg. That is 2 kg more than yesterday. Feeling short of breath.', time: '08:22', unread: true, priority: 'URGENT' },
  { id: 'm4', from: 'Carlos Mendez', type: 'Email', message: 'Attached are my glucose readings from the CGM for the past 2 weeks as requested.', time: 'Yesterday', unread: false, priority: 'NORMAL' },
  { id: 'm5', from: 'Maria Santos', type: 'Portal', message: 'Can I reschedule my appointment from April 20 to April 22?', time: 'Yesterday', unread: false, priority: 'LOW' },
];

const OUTBOUND = [
  { id: 'o1', to: 'Ahmed Al-Rashidi', type: 'SMS', message: 'Reminder: Please take your evening insulin as prescribed. Reply DONE when complete.', sentAt: '2026-04-04 08:00', status: 'DELIVERED', channel: 'Automated' },
  { id: 'o2', to: 'Khalid Al-Mansoori', type: 'Call', message: 'Outbound call — discussed CKD diet plan, answered questions about fluid restriction.', sentAt: '2026-04-03 14:30', status: 'COMPLETED', channel: 'Priya Sharma' },
  { id: 'o3', to: 'Fatima Al-Zaabi', type: 'SMS', message: 'Hi Fatima! Time for your weekly COPD check-in. How are you feeling today? Reply 1-5.', sentAt: '2026-04-03 10:00', status: 'DELIVERED', channel: 'Automated' },
  { id: 'o4', to: 'Robert Chen', type: 'Email', message: 'Your cardiac rehabilitation schedule for next week has been updated. Please review.', sentAt: '2026-04-02 16:00', status: 'OPENED', channel: 'System' },
  { id: 'o5', to: 'Lindiwe Dlamini', type: 'SMS', message: 'Congratulations! You have successfully completed your Gestational Diabetes pathway. Well done!', sentAt: '2026-04-01 11:00', status: 'DELIVERED', channel: 'Automated' },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  SMS:    <MessageSquare className="h-3.5 w-3.5" />,
  Call:   <Phone className="h-3.5 w-3.5" />,
  Email:  <Mail className="h-3.5 w-3.5" />,
  Portal: <MessageSquare className="h-3.5 w-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: 'text-emerald-600 bg-emerald-50',
  COMPLETED: 'text-blue-600 bg-blue-50',
  OPENED:    'text-violet-600 bg-violet-50',
  FAILED:    'text-red-600 bg-red-50',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'border-l-red-500',
  HIGH:   'border-l-amber-500',
  NORMAL: 'border-l-blue-400',
  LOW:    'border-l-slate-300',
};

export default function CommunicationsPage() {
  const [tab, setTab] = useState<'inbox' | 'outbound'>('inbox');
  const [selected, setSelected] = useState<string | null>('m3');

  const unread = INBOX.filter((m) => m.unread).length;
  const selectedMsg = tab === 'inbox' ? INBOX.find((m) => m.id === selected) : OUTBOUND.find((m) => m.id === selected);

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setTab('inbox')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'inbox' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Inbox className="h-4 w-4" /> Inbox
            {unread > 0 && <span className="h-4.5 min-w-4.5 px-1 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center">{unread}</span>}
          </button>
          <button onClick={() => setTab('outbound')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'outbound' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Send className="h-4 w-4" /> Outbound
          </button>
        </div>
        <Button icon={<Plus className="h-4 w-4" />}>New Message</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {/* Message list */}
        <div className="lg:col-span-2 overflow-hidden">
          <Card padding="none" className="h-full flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {tab === 'inbox' ? `${INBOX.length} messages · ${unread} unread` : `${OUTBOUND.length} sent`}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {(tab === 'inbox' ? INBOX : OUTBOUND).map((msg: any) => (
                <button
                  key={msg.id}
                  onClick={() => setSelected(msg.id)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors border-l-4 ${
                    selected === msg.id ? 'bg-blue-50 border-l-blue-500' : PRIORITY_COLORS[msg.priority ?? 'NORMAL'] ?? 'border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={tab === 'inbox' ? msg.from : msg.to} size="xs" />
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {tab === 'inbox' ? msg.from : msg.to}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        {TYPE_ICONS[msg.type]} {msg.type}
                      </span>
                      {tab === 'inbox' && msg.unread && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{msg.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {tab === 'inbox' ? msg.time : msg.sentAt}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Message detail */}
        <div className="lg:col-span-3 overflow-hidden">
          <Card padding="none" className="h-full flex flex-col overflow-hidden">
            {selectedMsg ? (
              <>
                <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={(selectedMsg as any).from ?? (selectedMsg as any).to} size="md" />
                      <div>
                        <p className="font-semibold text-slate-900">{(selectedMsg as any).from ?? (selectedMsg as any).to}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            {TYPE_ICONS[(selectedMsg as any).type]} via {(selectedMsg as any).type}
                          </span>
                          {tab === 'outbound' && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[(selectedMsg as any).status]}`}>
                              {(selectedMsg as any).status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 whitespace-nowrap">
                      {(selectedMsg as any).time ?? (selectedMsg as any).sentAt}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className={`max-w-xl ${tab === 'outbound' ? 'ml-auto' : ''}`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm text-slate-800 leading-relaxed ${
                      tab === 'inbox' ? 'bg-slate-100 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'
                    }`}>
                      {(selectedMsg as any).message}
                    </div>
                    {tab === 'outbound' && (selectedMsg as any).channel && (
                      <p className="text-[10px] text-slate-400 mt-1.5 text-right">
                        Sent by {(selectedMsg as any).channel}
                      </p>
                    )}
                  </div>
                </div>

                {tab === 'inbox' && (
                  <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100">
                    <div className="flex gap-3">
                      <textarea
                        placeholder="Type a reply…"
                        rows={2}
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <Button icon={<Send className="h-4 w-4" />} className="self-end">Send</Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a message to view</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
