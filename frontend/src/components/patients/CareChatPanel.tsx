'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Loader2, MessageSquare, Send } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  fetchEnrollmentCareChat,
  postEnrollmentCareChat,
  type ApiCareChatMessage,
} from '@/services/care-chat.service';
import { cn } from '@/lib/utils';

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function CareChatPanel({
  enrollmentId,
  patientName,
}: {
  enrollmentId: string;
  patientName: string;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

  const chatQuery = useQuery({
    queryKey: ['care-chat', enrollmentId],
    queryFn: () => fetchEnrollmentCareChat(enrollmentId, { limit: 100 }),
  });

  const postMutation = useMutation({
    mutationFn: () => postEnrollmentCareChat(enrollmentId, { body }),
    onSuccess: async () => {
      setBody('');
      await queryClient.invalidateQueries({ queryKey: ['care-chat', enrollmentId] });
    },
  });

  const messages = chatQuery.data?.data ?? [];
  const canSend = body.trim().length > 0 && !postMutation.isPending;

  return (
    <Card padding="none" className="overflow-hidden border-border/60">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Care Team Chat</h3>
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Internal updates and discussion for {patientName}</p>
          </div>
        </div>
        {chatQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>

      <div className="max-h-[520px] space-y-3 overflow-y-auto bg-muted/5 px-4 py-4 custom-scrollbar">
        {!chatQuery.isLoading && messages.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs font-medium text-muted-foreground">No care-team messages yet.</p>
          </div>
        ) : (
          messages.map((message: ApiCareChatMessage) => (
            <div
              key={message.id}
              className={cn(
                'rounded-2xl border px-4 py-3',
                message.messageType === 'system'
                  ? 'border-blue-100 bg-blue-50 text-blue-900'
                  : 'border-border/60 bg-card text-foreground shadow-sm',
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
                    message.messageType === 'system' ? 'bg-blue-100 text-blue-700' : 'bg-primary/10 text-primary',
                  )}
                >
                  {message.messageType === 'system' ? <Bot className="h-3.5 w-3.5" /> : <Avatar name={message.author?.name ?? 'Care Team'} size="xs" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide">
                      {message.messageType === 'system' ? 'System Update' : message.author?.name ?? 'Care Team'}
                    </p>
                    <span className="text-[10px] font-medium opacity-60">{formatChatTime(message.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">{message.body}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border/60 bg-card p-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write an internal note for the care team..."
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            disabled={!canSend}
            loading={postMutation.isPending}
            onClick={() => postMutation.mutate()}
            icon={<Send className="h-3.5 w-3.5" />}
          >
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
