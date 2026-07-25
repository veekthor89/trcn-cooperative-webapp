import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import trcnLogo from "@/assets/trcn-logo.png";

type Msg = { role: "user" | "assistant"; content: string; ts: number };

const SESSION_KEY = "coop_assistant_messages";
const GREETED_KEY = "coop_assistant_greeted";

const QUICK_REPLIES = [
  { emoji: "💰", text: "What's my savings balance?" },
  { emoji: "🏦", text: "Can I apply for a loan?" },
  { emoji: "🗓️", text: "What's my contribution balance?" },
  { emoji: "📊", text: "Show my recent transactions" },
];

// Hidden on these route prefixes (admin / exco / data management)
const HIDDEN_PREFIXES = [
  "/dashboard/admin",
  "/dashboard/exco",
  "/dashboard/bulk-upload",
];

const HIDDEN_EXACT = ["/", "/auth", "/change-password", "/unsubscribe"];

export default function CoopAssistant() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [firstName, setFirstName] = useState<string>("there");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth watcher + fetch first name
  useEffect(() => {
    let mounted = true;
    const load = async (uid: string) => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      if (mounted && data?.full_name) setFirstName(data.full_name.split(" ")[0]);
    };
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthed(!!data.session);
      if (data.session) load(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthed(!!session);
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(GREETED_KEY);
        setMessages([]);
        setShowQuickReplies(true);
        setOpen(false);
      }
      if (session) load(session.user.id);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load session-persisted messages
  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const parsed: Msg[] = JSON.parse(raw);
        setMessages(parsed);
        if (parsed.some((m) => m.role === "user")) setShowQuickReplies(false);
      } catch {}
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
  }, [messages]);

  // Greet on first open per session
  useEffect(() => {
    if (open && !sessionStorage.getItem(GREETED_KEY) && messages.length === 0) {
      const greet: Msg = {
        role: "assistant",
        content: `Hi ${firstName} 👋 I'm your COOP Assistant. I can help you check your balances, understand your loans, track your contributions and more. What would you like to know?`,
        ts: Date.now(),
      };
      setMessages([greet]);
      sessionStorage.setItem(GREETED_KEY, "1");
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, firstName, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const isHidden =
    HIDDEN_EXACT.includes(location.pathname) ||
    HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p));

  if (!authed || isHidden) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setShowQuickReplies(false);
    const userMsg: Msg = { role: "user", content: trimmed, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coop-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            messages: next.map((m) => ({ role: m.role, content: m.content })),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "failed");
      setMessages((cur) => [
        ...cur,
        { role: "assistant", content: data.reply || "…", ts: Date.now() },
      ]);
    } catch (e) {
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again in a moment.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const timeFmt = (ts: number) =>
    new Date(ts).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open COOP Assistant"
          className="group fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        >
          <MessageCircle className="h-6 w-6" />
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 fill-yellow-300 animate-pulse" />
          <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md bg-foreground text-background text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
            COOP Assistant
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed z-[60] bg-background border border-border shadow-2xl flex flex-col",
            "inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[520px] sm:w-[380px] sm:rounded-xl",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground sm:rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="relative">
                <MessageCircle className="h-5 w-5" />
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">COOP Assistant</p>
                <p className="text-xs opacity-90 leading-tight">Ask me anything about your account</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-muted/30">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-background text-foreground border border-border rounded-bl-sm",
                  )}
                >
                  {m.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{timeFmt(m.ts)}</span>
              </div>
            ))}

            {/* Quick replies after greeting */}
            {showQuickReplies && messages.length > 0 && !loading && (
              <div className="flex flex-wrap gap-2 pt-2">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q.text}
                    onClick={() => send(q.text)}
                    className="text-xs bg-background border border-border rounded-full px-3 py-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                  >
                    <span className="mr-1">{q.emoji}</span>
                    {q.text}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-start">
                <div className="bg-background border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3 bg-background sm:rounded-b-xl"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your account..."
              disabled={loading}
              className="flex-1 bg-muted/50 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="rounded-full h-9 w-9 shrink-0"
              aria-label="Send"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
