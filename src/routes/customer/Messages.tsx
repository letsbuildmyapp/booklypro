import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send } from "lucide-react";
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
      {/* Hide the page header on mobile when a conversation is active so the chat can fill the viewport */}
      <div className={cn(activeId ? "hidden md:block" : "block", "mb-6")}>
        <h1 className="text-title1 font-semibold tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-1">Chat with the businesses you've booked.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr] md:min-h-[520px]">
          <div className={cn("md:border-r border-border bg-secondary/30 min-w-0", activeId ? "hidden md:block" : "block")}>
            <div className="h-[calc(100dvh-12rem)] md:h-[520px] overflow-y-auto overflow-x-hidden">
              <div className="p-2">
                {conversations.length === 0 && <div className="p-6 text-sm text-muted-foreground">No conversations yet.</div>}
                {conversations.map((c) => {
                  const booking = getBooking(c.bookingId);
                  const business = booking ? getBusiness(booking.businessId) : null;
                  const unread = c.unreadCounts[user.id] ?? 0;
                  // Derive preview + timestamp from the actual most-recent message so the list
                  // always reflects whoever spoke last — user or other party.
                  const msgs = listMessages(c.id);
                  const latest = msgs[msgs.length - 1];
                  const preview = latest?.body ?? c.lastMessagePreview ?? "No messages yet";
                  const lastAt = latest?.createdAt ?? c.lastMessageAt;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveId(c.id);
                        markConversationRead(c.id, user.id);
                        if (params.get("c")) { params.delete("c"); setParams(params, { replace: true }); }
                      }}
                      className={cn(
                        "block w-full text-left p-3 rounded-2xl transition-colors",
                        activeId === c.id ? "bg-card shadow-soft" : "hover:bg-card/50"
                      )}
                    >
                      <div className="grid grid-cols-[auto_1fr] items-center gap-3 w-full">
                        <Avatar className="h-11 w-11"><AvatarFallback>{initials(business?.name ?? "?")}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
                            <span className="font-semibold text-[15px] truncate flex items-center gap-1.5">
                              {business?.name}
                              {unread > 0 && <span className="h-2 w-2 rounded-full bg-accent shrink-0" />}
                            </span>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{fmtRelative(lastAt, user.timezone)}</span>
                          </div>
                          <p className={cn("text-sm truncate mt-0.5", unread ? "text-foreground font-medium" : "text-muted-foreground")}>{preview}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {active ? (() => {
            const booking = getBooking(active.bookingId);
            const business = booking ? getBusiness(booking.businessId) : null;
            return (
              <div className={activeId ? "block" : "hidden md:block"}>
                <ChatPane
                  conversationId={active.id}
                  userId={user.id}
                  onBack={() => setActiveId(null)}
                  header={{
                    title: business?.name ?? "Conversation",
                    subtitle: booking ? fmtInTz(booking.startAt, business?.timezone ?? user.timezone, "EEE, MMM d · h:mm a") : undefined,
                    avatar: business?.logo,
                  }}
                />
              </div>
            );
          })() : (
            <div className="hidden md:grid place-items-center text-muted-foreground p-12">Select a conversation</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ChatPane({ conversationId, userId, onBack, header }: {
  conversationId: string;
  userId: string;
  onBack: () => void;
  header: { title: string; subtitle?: string; avatar?: string };
}) {
  const [text, setText] = useState("");
  const messages = listMessages(conversationId);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(conversationId, userId, text.trim());
    setText("");
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)] md:h-[520px]">
      <div className="flex items-center gap-3 border-b border-border px-3 sm:px-4 py-3">
        <button
          onClick={onBack}
          type="button"
          aria-label="Back to all conversations"
          className="md:hidden touch-target inline-flex h-9 w-9 -ml-1 items-center justify-center rounded-2xl text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar className="h-9 w-9 shrink-0">
          {header.avatar && <AvatarImage src={header.avatar} alt="" />}
          <AvatarFallback>{initials(header.title)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{header.title}</div>
          {header.subtitle && <div className="text-[11px] text-muted-foreground truncate tabular-nums">{header.subtitle}</div>}
        </div>
      </div>
      <ScrollArea className="flex-1 p-4 md:p-5">
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
