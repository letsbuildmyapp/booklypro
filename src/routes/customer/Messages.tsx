import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { listConversationsForUser, listMessages, sendMessage, markConversationRead, getBooking, getBusiness, userById, subscribe } from "@/lib/api";
import { fmtInTz, fmtRelative } from "@/lib/time";
import { initials, cn } from "@/lib/utils";

export default function CustomerMessages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);
  const requestedId = params.get("c");
  const [activeId, setActiveId] = useState<string | null>(requestedId);

  // If the URL has ?c=<conversationId>, select it and mark read.
  useEffect(() => {
    if (!requestedId || !user) return;
    setActiveId(requestedId);
    markConversationRead(requestedId, user.id);
  }, [requestedId, user]);

  if (!user) return null;
  const conversations = listConversationsForUser(user.id);
  const active = activeId ? conversations.find((c) => c.id === activeId) : conversations[0];

  return (
    <div>
      <h1 className="text-title1 font-semibold tracking-tight">Messages</h1>
      <p className="text-muted-foreground mt-1 mb-6">Chat with the businesses you've booked.</p>

      <Card className="p-0 overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr] min-h-[520px]">
          <div className="border-r border-border bg-secondary/30">
            <ScrollArea className="h-[520px]">
              <div className="p-2">
                {conversations.length === 0 && <div className="p-6 text-sm text-muted-foreground">No conversations yet.</div>}
                {conversations.map((c) => {
                  const booking = getBooking(c.bookingId);
                  const business = booking ? getBusiness(booking.businessId) : null;
                  const unread = c.unreadCounts[user.id] ?? 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveId(c.id);
                        markConversationRead(c.id, user.id);
                        if (params.get("c")) { params.delete("c"); setParams(params, { replace: true }); }
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-2xl transition-colors",
                        active?.id === c.id ? "bg-card shadow-soft" : "hover:bg-card/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10"><AvatarFallback>{initials(business?.name ?? "?")}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm truncate">{business?.name}</span>
                            <span className="text-[11px] text-muted-foreground shrink-0">{fmtRelative(c.lastMessageAt, user.timezone)}</span>
                          </div>
                          <p className={cn("text-xs truncate mt-0.5", unread ? "text-foreground font-medium" : "text-muted-foreground")}>{c.lastMessagePreview}</p>
                        </div>
                        {unread > 0 && <span className="h-2 w-2 rounded-full bg-accent shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {active ? <ChatPane conversationId={active.id} userId={user.id} /> : <div className="grid place-items-center text-muted-foreground p-12">Select a conversation</div>}
        </div>
      </Card>
    </div>
  );
}

function ChatPane({ conversationId, userId }: { conversationId: string; userId: string }) {
  const [text, setText] = useState("");
  const messages = listMessages(conversationId);
  const otherIds = (() => {
    const c = listMessages(conversationId);
    return Array.from(new Set(c.map((m) => m.senderId).filter((id) => id !== userId)));
  })();

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(conversationId, userId, text.trim());
    setText("");
  }

  return (
    <div className="flex flex-col h-[520px]">
      <ScrollArea className="flex-1 p-5">
        <div className="space-y-3">
          {messages.map((m) => {
            const mine = m.senderId === userId;
            const sender = userById(m.senderId);
            return (
              <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{initials(sender?.displayName ?? "?")}</AvatarFallback></Avatar>}
                <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"
                )}>
                  {m.body}
                  <div className={cn("text-[10px] mt-1 tabular-nums", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {fmtInTz(m.createdAt, "UTC", "h:mm a")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="flex-1" />
        <Button type="submit" size="icon" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
