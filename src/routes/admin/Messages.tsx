import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Send, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  getBooking, getBusinessBySlug, listConversationsForBusiness, listMessages,
  listServices, markConversationRead, sendMessage, subscribe, userById,
} from "@/lib/api";
import { fmtInTz, fmtRelative } from "@/lib/time";
import { initials, cn } from "@/lib/utils";

export default function AdminMessages() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  const requested = params.get("c");
  const [activeId, setActiveId] = useState<string | null>(requested);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => { if (requested) setActiveId(requested); }, [requested]);

  const allConversations = listConversationsForBusiness(business.id);
  const unreadFor = (cid: string) => {
    // Sum unread across business participants (typically just the owner).
    const c = allConversations.find((x) => x.id === cid);
    if (!c) return 0;
    return Object.values(c.unreadCounts).reduce((s, n) => s + (n ?? 0), 0);
  };
  const conversations = filter === "unread"
    ? allConversations.filter((c) => unreadFor(c.id) > 0)
    : allConversations;

  const active = activeId ? conversations.find((c) => c.id === activeId) ?? allConversations.find((c) => c.id === activeId) : conversations[0];
  const totalUnread = useMemo(() => allConversations.reduce((s, c) => s + unreadFor(c.id), 0), [allConversations]);

  if (!user) return null;

  function pickConv(cid: string) {
    setActiveId(cid);
    if (user) markConversationRead(cid, user.id);
    if (params.get("c")) { params.delete("c"); setParams(params, { replace: true }); }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Every conversation tied to a {business.name} booking.
            {totalUnread > 0 && <> · <span className="text-accent font-medium">{totalUnread} unread</span></>}
          </p>
        </div>
        <div className="inline-flex items-center rounded-2xl bg-secondary p-1 text-muted-foreground">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
              filter === "all" ? "bg-card text-foreground shadow-soft" : "hover:text-foreground"
            )}
          >
            All · {allConversations.length}
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
              filter === "unread" ? "bg-card text-foreground shadow-soft" : "hover:text-foreground"
            )}
          >
            Unread · {allConversations.filter((c) => unreadFor(c.id) > 0).length}
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="grid md:grid-cols-[320px_1fr] min-h-[560px]">
          <div className="border-r border-border bg-secondary/30">
            <ScrollArea className="h-[560px]">
              <div className="p-2">
                {conversations.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    <MessageSquare className="h-7 w-7 mx-auto mb-2 opacity-40" />
                    {filter === "unread" ? "Caught up. No unread threads." : "No conversations yet."}
                  </div>
                )}
                {conversations.map((c) => {
                  const booking = getBooking(c.bookingId);
                  const customer = booking ? userById(booking.customerUserId) : null;
                  const customerName = customer?.displayName ?? booking?.customerSnapshot.name ?? "Customer";
                  const unread = unreadFor(c.id);
                  const service = booking ? listServices(business.id).find((s) => s.id === booking.serviceId) : null;
                  return (
                    <button
                      key={c.id}
                      onClick={() => pickConv(c.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-2xl transition-colors",
                        active?.id === c.id ? "bg-card shadow-soft" : "hover:bg-card/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {customer?.avatar && <AvatarImage src={customer.avatar} alt="" />}
                          <AvatarFallback>{initials(customerName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm truncate">{customerName}</span>
                            <span className="text-[11px] text-muted-foreground shrink-0">{fmtRelative(c.lastMessageAt, business.timezone)}</span>
                          </div>
                          {service && booking && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {service.name} · {fmtInTz(booking.startAt, business.timezone, "MMM d")}
                            </div>
                          )}
                          <p className={cn("text-xs truncate mt-0.5", unread ? "text-foreground font-medium" : "text-muted-foreground")}>
                            {c.lastMessagePreview || "No messages yet"}
                          </p>
                        </div>
                        {unread > 0 && (
                          <Badge variant="accent" className="!px-2 !py-0 text-[10px] tabular-nums">{unread}</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {active ? (
            <ChatPane conversationId={active.id} userId={user.id} businessTz={business.timezone} />
          ) : (
            <div className="grid place-items-center text-muted-foreground p-12">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Pick a conversation to read</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ChatPane({ conversationId, userId, businessTz }: { conversationId: string; userId: string; businessTz: string }) {
  const [text, setText] = useState("");
  const messages = listMessages(conversationId);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(conversationId, userId, text.trim());
    setText("");
  }

  return (
    <div className="flex flex-col h-[560px]">
      <ScrollArea className="flex-1 p-5">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              No messages in this thread yet — say hi.
            </div>
          )}
          {messages.map((m) => {
            const mine = m.senderId === userId;
            const sender = userById(m.senderId);
            return (
              <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && (
                  <Avatar className="h-7 w-7">
                    {sender?.avatar && <AvatarImage src={sender.avatar} alt="" />}
                    <AvatarFallback className="text-[10px]">{initials(sender?.displayName ?? "?")}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"
                  )}
                >
                  {!mine && sender && (
                    <div className="text-[11px] font-medium opacity-70 mb-0.5">{sender.displayName}</div>
                  )}
                  {m.body}
                  <div className={cn("text-[10px] mt-1 tabular-nums", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {fmtInTz(m.createdAt, businessTz, "h:mm a")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply as the business…" className="flex-1" />
        <Button type="submit" size="icon" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
