import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  MailOpen,
  CheckCheck,
  ArrowLeft,
  Trash2,
  Inbox,
  RotateCcw,
  AlertTriangle,
  X,
} from "lucide-react";
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

function daysLeft(deletedAt: string | null) {
  if (!deletedAt) return 0;
  const deleteTime = new Date(deletedAt).getTime();
  const expiresAt = deleteTime + 3 * 24 * 60 * 60 * 1000;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

function invalidateMailbox() {
  queryClient.invalidateQueries({ queryKey: ["/api/mailbox"] });
  queryClient.invalidateQueries({ queryKey: ["/api/mailbox/trash"] });
  queryClient.invalidateQueries({ queryKey: ["/api/mailbox/unread"] });
}

export default function Mailbox() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"inbox" | "trash">("inbox");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: inboxMessages, isLoading: inboxLoading } = useQuery<
    MailboxMessage[]
  >({
    queryKey: ["/api/mailbox"],
    enabled: !!user,
  });

  const { data: trashMessages, isLoading: trashLoading } = useQuery<
    MailboxMessage[]
  >({
    queryKey: ["/api/mailbox/trash"],
    enabled: !!user && tab === "trash",
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/mailbox/${id}/read`);
    },
    onSuccess: invalidateMailbox,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/mailbox/read-all");
    },
    onSuccess: invalidateMailbox,
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/mailbox/${id}/delete`);
    },
    onSuccess: () => {
      setSelected(null);
      invalidateMailbox();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/mailbox/${id}/restore`);
    },
    onSuccess: () => {
      setSelected(null);
      invalidateMailbox();
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/mailbox/${id}`);
    },
    onSuccess: () => {
      setSelected(null);
      invalidateMailbox();
    },
  });

  const handleSelect = (msg: MailboxMessage) => {
    setSelected(selected === msg.id ? null : msg.id);
    if (!msg.read && tab === "inbox") {
      markReadMutation.mutate(msg.id);
    }
  };

  const messages = tab === "inbox" ? inboxMessages : trashMessages;
  const isLoading = tab === "inbox" ? inboxLoading : trashLoading;
  const unreadCount = inboxMessages?.filter((m) => !m.read).length ?? 0;
  const trashCount = trashMessages?.length ?? 0;

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
          <h1 className="text-xl font-bold text-foreground">Mailbox</h1>
        </div>
        {tab === "inbox" && unreadCount > 0 && (
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

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setTab("inbox");
            setSelected(null);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            tab === "inbox"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground bg-muted/30"
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          Inbox
          {unreadCount > 0 && (
            <span className="ml-0.5 tabular-nums bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full leading-none font-bold">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setTab("trash");
            setSelected(null);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            tab === "trash"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground bg-muted/30"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Trash
          {trashCount > 0 && (
            <span className="ml-0.5 tabular-nums text-[10px]">
              ({trashCount})
            </span>
          )}
        </button>
      </div>

      {/* Trash info banner */}
      {tab === "trash" && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          Messages in trash are automatically deleted forever after 3 days.
        </div>
      )}

      {/* Messages list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !messages || messages.length === 0 ? (
        <div className="text-center py-16">
          {tab === "inbox" ? (
            <>
              <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Your inbox is empty.
              </p>
            </>
          ) : (
            <>
              <Trash2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Trash is empty.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => {
            const isOpen = selected === msg.id;
            const remaining = tab === "trash" ? daysLeft(msg.deletedAt) : 0;
            return (
              <div
                key={msg.id}
                className={`rounded-xl border transition-colors ${
                  tab === "trash"
                    ? "border-border bg-card/40 opacity-80"
                    : msg.read
                    ? "border-border bg-card/50"
                    : "border-primary/20 bg-primary/5"
                }`}
              >
                {/* Row */}
                <div className="flex items-center">
                  <button
                    onClick={() => handleSelect(msg)}
                    className="flex-1 px-4 py-3 flex items-center gap-3 text-left min-w-0"
                  >
                    <div className="shrink-0">
                      {tab === "trash" ? (
                        <Trash2 className="w-4 h-4 text-muted-foreground/50" />
                      ) : msg.read ? (
                        <MailOpen className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Mail className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${
                            msg.read || tab === "trash"
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
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span>From {msg.senderName}</span>
                        <span>·</span>
                        <span>{formatDate(msg.createdAt)}</span>
                        {tab === "trash" && remaining > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-amber-400">
                              {remaining}d left
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Quick action button */}
                  {tab === "inbox" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        softDeleteMutation.mutate(msg.id);
                      }}
                      className="p-2.5 mr-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                      title="Move to trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Expanded body */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 ml-7 border-t border-border">
                    <div className="pt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {msg.body}
                    </div>

                    {/* Trash actions */}
                    {tab === "trash" && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => restoreMutation.mutate(msg.id)}
                          disabled={restoreMutation.isPending}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore to Inbox
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs text-rose-400 hover:text-rose-300 border-rose-500/20 hover:bg-rose-500/10"
                          onClick={() => {
                            if (
                              confirm(
                                "Permanently delete this message? This cannot be undone."
                              )
                            ) {
                              permanentDeleteMutation.mutate(msg.id);
                            }
                          }}
                          disabled={permanentDeleteMutation.isPending}
                        >
                          <X className="w-3 h-3" />
                          Delete Forever
                        </Button>
                      </div>
                    )}

                    {/* Inbox delete action */}
                    {tab === "inbox" && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs text-muted-foreground"
                          onClick={() => softDeleteMutation.mutate(msg.id)}
                          disabled={softDeleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                          Move to Trash
                        </Button>
                      </div>
                    )}
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
