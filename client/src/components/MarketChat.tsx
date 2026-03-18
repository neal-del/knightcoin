import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Trash2, Lock, Shield, TrendingUp } from "lucide-react";
import type { ChatMessage } from "@shared/schema";
import { formatKC } from "@/lib/format";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function MarketChat({ marketId }: { marketId: string }) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/markets", marketId, "chat"],
    refetchInterval: expanded ? 8000 : false,
  });

  const { data: eligibility } = useQuery<{
    eligible: boolean;
    stake?: number;
    needed?: number;
    isAdmin?: boolean;
    reason?: string;
  }>({
    queryKey: ["/api/markets", marketId, "chat", "eligible"],
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", `/api/markets/${marketId}/chat`, {
        content: text,
      });
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({
        queryKey: ["/api/markets", marketId, "chat"],
      });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't send message",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/chat/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/markets", marketId, "chat"],
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, expanded]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canChat = eligibility?.eligible ?? false;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header — always visible, toggles expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Market Chat
          </h3>
          {messages.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full tabular-nums">
              {messages.length}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <>
          {/* Messages area */}
          <div
            ref={scrollRef}
            className="max-h-72 overflow-y-auto border-t border-border px-4 py-3 space-y-3"
          >
            {isLoading ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Loading...
              </p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No messages yet. Be the first to say something.
              </p>
            ) : (
              messages.map((msg) => {
                const isSystem = msg.userId === "__system__";
                if (isSystem) {
                  return (
                    <div key={msg.id} className="group flex items-center gap-2 px-2 py-1">
                      <TrendingUp className="w-3 h-3 text-primary/60 shrink-0" />
                      <span className="text-[11px] text-primary/70 italic">
                        {msg.content}
                      </span>
                      <span className="text-[9px] text-muted-foreground/50 ml-auto shrink-0">
                        {timeAgo(msg.createdAt)}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => deleteMutation.mutate(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-rose-400 transition-all"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className="group flex gap-2.5">
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[11px] font-bold text-primary">
                        {msg.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {msg.displayName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(msg.createdAt)}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => deleteMutation.mutate(msg.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-rose-400 transition-all"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed break-words">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border px-4 py-3">
            {!user ? (
              <p className="text-xs text-muted-foreground text-center">
                Sign in to participate in the chat.
              </p>
            ) : !canChat ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Stake at least <strong className="text-foreground">10 KC</strong> in this market to chat.
                  {eligibility?.stake !== undefined && eligibility.stake > 0 && (
                    <> You have {formatKC(eligibility.stake)} KC staked — need {formatKC(eligibility.needed || 0)} more.</>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {eligibility?.isAdmin && (
                  <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Say something..."
                  maxLength={500}
                  className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!content.trim() || sendMutation.isPending}
                  className="h-9 w-9 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
