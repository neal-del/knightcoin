import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Users, User, Megaphone } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
}

export default function AdminMessages() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [recipientType, setRecipientType] = useState<"all" | "individual">("all");
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");

  const { data: users } = useQuery<UserSummary[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        recipientId: recipientType === "all" ? "__all__" : recipientId,
        subject,
        body,
      };
      const res = await apiRequest("POST", "/api/admin/messages", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description:
          recipientType === "all"
            ? "Broadcast sent to all users."
            : "Message sent successfully.",
      });
      setSubject("");
      setBody("");
      setRecipientId("");
      setSearch("");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Missing fields",
        description: "Subject and body are required.",
        variant: "destructive",
      });
      return;
    }
    if (recipientType === "individual" && !recipientId) {
      toast({
        title: "Select a recipient",
        description: "Choose a user to send to.",
        variant: "destructive",
      });
      return;
    }
    sendMutation.mutate();
  };

  // Filter users by search
  const regularUsers = users?.filter((u) => u.role !== "admin") || [];
  const filtered = search
    ? regularUsers.filter(
        (u) =>
          u.displayName.toLowerCase().includes(search.toLowerCase()) ||
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
      )
    : regularUsers;

  const selectedUser = users?.find((u) => u.id === recipientId);

  if (!isAdmin) return null;

  return (
    <div className="px-4 md:px-8 py-6 max-w-[700px] mx-auto space-y-6">
      <div>
        <Link href="/admin">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-2">
            <ArrowLeft className="w-3 h-3" /> Admin Panel
          </span>
        </Link>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Send Message
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Send a notification to one user or broadcast to everyone.
        </p>
      </div>

      {/* Recipient type toggle */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-foreground block">Recipient</label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setRecipientType("all");
              setRecipientId("");
              setSearch("");
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              recipientType === "all"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
            }`}
          >
            <Users className="w-4 h-4" />
            All Users
          </button>
          <button
            onClick={() => setRecipientType("individual")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              recipientType === "individual"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
            }`}
          >
            <User className="w-4 h-4" />
            Individual
          </button>
        </div>
      </div>

      {/* Individual user picker */}
      {recipientType === "individual" && (
        <div className="space-y-2">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted/30"
          />
          {selectedUser && (
            <div className="text-xs bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span>
                Sending to: <strong>{selectedUser.displayName}</strong>{" "}
                <span className="text-muted-foreground">({selectedUser.username})</span>
              </span>
              <button
                onClick={() => setRecipientId("")}
                className="text-muted-foreground hover:text-foreground text-[10px]"
              >
                Change
              </button>
            </div>
          )}
          {!selectedUser && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-card divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-3">
                  No users found.
                </div>
              ) : (
                filtered.slice(0, 20).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setRecipientId(u.id);
                      setSearch("");
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm text-foreground">{u.displayName}</span>
                    <span className="text-[11px] text-muted-foreground">{u.username}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Subject */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground block">Subject</label>
        <Input
          placeholder="e.g. Welcome to The Knight Market!"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="bg-muted/30"
        />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground block">Message</label>
        <textarea
          placeholder="Write your message here..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
        />
      </div>

      {/* Send button */}
      <Button
        onClick={handleSend}
        disabled={sendMutation.isPending || !subject.trim() || !body.trim()}
        className="w-full gap-2 font-semibold"
      >
        <Send className="w-4 h-4" />
        {sendMutation.isPending
          ? "Sending..."
          : recipientType === "all"
          ? "Send to All Users"
          : selectedUser
          ? `Send to ${selectedUser.displayName}`
          : "Select a Recipient"}
      </Button>
    </div>
  );
}
