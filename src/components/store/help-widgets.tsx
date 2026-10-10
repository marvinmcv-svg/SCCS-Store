'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Floating help: Marvin (AI receptionist) and the WhatsApp chat widget.
 * Sits above the mobile tab bar and the sticky buy bars; hidden in checkout.
 */
export function HelpWidgets({ whatsapp }: { whatsapp: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState<'marvin' | 'whatsapp' | null>(null);
  if (pathname.startsWith('/checkout')) return null;
  const stickyBar = /^\/(p\/|bundles\/.+|bag)/.test(pathname);

  return (
    <>
      <div
        className={cn(
          'fixed right-4 z-[var(--z-sticky)] flex flex-col items-end gap-3 md:right-6 md:bottom-6',
          stickyBar ? 'bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+88px)]' : 'bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+14px)]',
          open === 'marvin' && 'max-md:hidden',
        )}
      >
        {open === 'whatsapp' && <WhatsAppCard number={whatsapp} onClose={() => setOpen(null)} />}
        <MarvinLauncher active={open === 'marvin'} onClick={() => setOpen(open === 'marvin' ? null : 'marvin')} />
        <WhatsAppLauncher active={open === 'whatsapp'} onClick={() => setOpen(open === 'whatsapp' ? null : 'whatsapp')} />
      </div>
      {open === 'marvin' && <MarvinPanel whatsapp={whatsapp} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------------------------------- WhatsApp --------------------------------- */

const WA_GREEN = '#25D366';

export function WhatsAppGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function WhatsAppLauncher({ active, onClick }: { active: boolean; onClick: () => void }) {
  const t = useTranslations('whatsapp');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('open')}
      aria-expanded={active}
      title={t('open')}
      style={{ backgroundColor: WA_GREEN }}
      className="pressable grid size-14 place-items-center rounded-full text-white shadow-[0_6px_20px_rgba(37,211,102,0.35)] transition-transform hover:scale-105"
    >
      {active ? (
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      ) : (
        <WhatsAppGlyph className="size-7" />
      )}
    </button>
  );
}

function WhatsAppCard({ number, onClose }: { number: string; onClose: () => void }) {
  const t = useTranslations('whatsapp');
  const tc = useTranslations('common');
  const href = `https://wa.me/${number}?text=${encodeURIComponent(t('prefill'))}`;
  return (
    <div role="dialog" aria-label={t('open')} className="w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-[20px] bg-bg-elevated shadow-3 ring-1 ring-line">
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: '#075E54' }}>
        <span className="grid size-10 place-items-center rounded-full bg-white/15">
          <WhatsAppGlyph className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{t('name')}</span>
          <span className="block text-[12px] opacity-80">{t('status')}</span>
        </span>
        <button type="button" onClick={onClose} aria-label={tc('close')} className="pressable grid size-9 place-items-center rounded-full hover:bg-white/15">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="px-4 py-5" style={{ backgroundColor: 'color-mix(in srgb, #ECE5DD 70%, var(--bg-elevated))' }}>
        <p className="max-w-[85%] rounded-[12px] rounded-tl-[4px] bg-white px-3 py-2 text-[14px] leading-snug text-[#111] shadow-1">{t('bubble')}</p>
      </div>
      <div className="p-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ backgroundColor: WA_GREEN }}
          className="pressable flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white"
        >
          <WhatsAppGlyph className="size-5" />
          {t('start')}
        </a>
        <p className="t-caption mt-2 text-center text-ink-2 tabular">+{number.replace(/^591(\d{8})$/, '591 $1')}</p>
      </div>
    </div>
  );
}

/* ----------------------------------- Marvin ---------------------------------- */

type Msg = { role: 'user' | 'assistant'; content: string };
const STORE_KEY = 'sccs-marvin-v1';

function MarvinAvatar({ className }: { className?: string }) {
  return (
    <span className={cn('grid place-items-center rounded-full bg-accent font-semibold text-accent-ink', className)} aria-hidden>
      M
    </span>
  );
}

function MarvinLauncher({ active, onClick }: { active: boolean; onClick: () => void }) {
  const t = useTranslations('marvin');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('open')}
      aria-expanded={active}
      title={t('open')}
      className="pressable group flex h-14 items-center gap-2 rounded-full bg-ink pr-5 pl-2 text-bg shadow-3 transition-transform hover:scale-[1.03]"
    >
      <MarvinAvatar className="size-10 text-[17px]" />
      <span className="text-[14px] font-semibold">{t('title')}</span>
    </button>
  );
}

/** Minimal formatting: **bold**, site paths and https links become links. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+|(?<![\w/])\/(?:en\/)?[a-z0-9][\w\-/?=&.]*)/gi);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        const clean = p.replace(/[.,;:!?]+$/, '');
        const trail = p.slice(clean.length);
        if (/^https?:\/\//.test(p))
          return (
            <React.Fragment key={i}>
              <a href={clean} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
                {clean.replace(/^https?:\/\//, '')}
              </a>
              {trail}
            </React.Fragment>
          );
        if (p.startsWith('/'))
          return (
            <React.Fragment key={i}>
              <a href={clean} className="break-all underline underline-offset-2">
                {clean}
              </a>
              {trail}
            </React.Fragment>
          );
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

function MarvinPanel({ whatsapp, onClose }: { whatsapp: string; onClose: () => void }) {
  const t = useTranslations('marvin');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [messages, setMessages] = React.useState<Msg[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      return raw ? (JSON.parse(raw) as Msg[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  React.useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      abortRef.current?.abort();
    };
  }, [onClose]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const mine: Msg = { role: 'user', content: q };
    const history = [...messages, mine].filter((m) => m.content.trim()).slice(-20);
    while (history.length && history[0].role !== 'user') history.shift();
    setMessages([...messages, mine, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const setLast = (fn: (s: string) => string) =>
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: fn(copy[copy.length - 1].content) };
        return copy;
      });
    try {
      const res = await fetch('/api/marvin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, messages: history }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        setLast(() => (res.status === 429 ? t('rateLimited') : t('error')));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setLast((s) => s + chunk);
      }
      setLast((s) => s.trim() || t('error'));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setLast(() => t('error'));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const suggestions = t.raw('suggestions') as string[];
  const last = messages[messages.length - 1];

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t('open')}
      className="fixed inset-x-0 bottom-0 z-[var(--z-sheet)] flex h-[min(88dvh,680px)] flex-col overflow-hidden rounded-t-[24px] bg-bg-elevated shadow-3 ring-1 ring-line md:inset-x-auto md:right-6 md:bottom-6 md:h-[min(640px,calc(100dvh-48px))] md:w-[400px] md:rounded-[24px]"
    >
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <MarvinAvatar className="size-10 text-[17px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{t('title')}</p>
          <p className="t-caption truncate text-ink-2">{t('subtitle')}</p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={() => !busy && setMessages([])} className="t-caption pressable rounded-full px-3 py-2 text-ink-2 hover:bg-bg-subtle hover:text-ink">
            {t('reset')}
          </button>
        )}
        <button type="button" onClick={onClose} aria-label={tc('close')} className="pressable grid size-10 place-items-center rounded-full hover:bg-bg-subtle">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
        <Bubble role="assistant">{t('greeting')}</Bubble>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="pressable rounded-full border border-line px-3 py-1.5 text-left text-[13px] hover:bg-bg-subtle">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) =>
          m.content ? (
            <Bubble key={i} role={m.role}>
              {m.role === 'assistant' ? <Rich text={m.content} /> : m.content}
            </Bubble>
          ) : null,
        )}
        {busy && last?.role === 'assistant' && !last.content && (
          <p className="t-caption flex items-center gap-2 text-ink-2">
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-1.5 animate-pulse rounded-full bg-ink-2" style={{ animationDelay: `${d * 150}ms` }} />
              ))}
            </span>
            {t('thinking')}
          </p>
        )}
      </div>

      <div className="safe-bottom border-t border-line px-3 pt-3 pb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] bg-bg-subtle px-4 py-2.5 text-[16px] outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-accent md:text-[15px]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label={t('send')}
            className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <p className="text-[11px] leading-tight text-ink-3">{t('disclaimer')}</p>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-[12px] font-medium" style={{ color: '#128C7E' }}>
            <WhatsAppGlyph className="size-4" />
            <span className="sr-only">{t('human')}</span>
            <span aria-hidden>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, children }: { role: Msg['role']; children: React.ReactNode }) {
  return role === 'user' ? (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-ink px-3.5 py-2 text-[14.5px] leading-snug whitespace-pre-wrap text-bg">{children}</p>
    </div>
  ) : (
    <div className="flex items-end gap-2">
      <MarvinAvatar className="size-7 shrink-0 text-[12px]" />
      <p className="max-w-[85%] rounded-[18px] rounded-bl-[6px] bg-bg-subtle px-3.5 py-2 text-[14.5px] leading-snug whitespace-pre-wrap">{children}</p>
    </div>
  );
}

