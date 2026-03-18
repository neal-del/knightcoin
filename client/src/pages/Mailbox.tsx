import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MailOpen, CheckCheck, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { MailboxMessage } from "@shared/schema";

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Mailbox() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: messages, isLoading } = useQuery<MailboxMessage[]>({
    queryKey: ["/api/mailbox"],
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/mailbox/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mailbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mailbox/unread"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/mailbox/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mailbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mailbox/unread"] });
    },
  });

  const handleSelect = (msg: MailboxMessage) => {
    setSelected(selected === msg.id ? null : msg.id);
    if (!msg.read) {
      markReadMutation.mutate(msg.id);
    }
  };

  const unreadCount = messages?.filter((m) => !m.read).length ?? 0;

  if (!user) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-[800px] mx-auto text-center py-20">
        <p className="text-muted-foreground">Sign in to view your mailbox.</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-[800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-2">
              <ArrowLeft className="w-3 h-3" /> Dashboard
            </span>
          </Link>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            Mailbox
            {unreadCount > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                {unreadCount} new
              </Badge>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Messages list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !messages || messages.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Your mailbox is empty.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => {
            const isOpen = selected === msg.id;
            return (
              <div
                key={msg.id}
                className={`rounded-xl border transition-colors ${
                  msg.read
                    ? "border-border bg-card/50"
                    : "border-primary/20 bg-primary/5"
                }`}
              >
                {/* Row */}
                <button
                  onClick={() => handleSelect(msg)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className="shrink-0">
                    {msg.read ? (
                      <MailOpen className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Mail className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm truncate ${
                          msg.read
                            ? "text-foreground"
                            : "text-foreground font-semibold"
                        }`}
                      >
                        {msg.subject}
                      </span>
                      {msg.recipientId === "__all__" && (
                        <Badge className="text-[9px] px-1 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20 shrink-0">
                          Broadcast
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      From {msg.senderName} · {formatDate(msg.createdAt)}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 ml-7 border-t border-border mt-0">
                    <div className="pt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {msg.body}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
