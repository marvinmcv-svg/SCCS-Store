'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CrestMark } from '@/components/ui/icons';
import { useStore } from './store-provider';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = 'sccs:pwa';

function read(): { visits: number; dismissed?: number; installed?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{"visits":0}');
  } catch {
    return { visits: 0 };
  }
}
function write(v: ReturnType<typeof read>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

/**
 * Registers the service worker (production) and offers "Add to home
 * screen" only after engagement: from the 3rd visit or once something is
 * in the bag. Never on first load; dismissals are respected for 30 days.
 */
export function Pwa() {
  const t = useTranslations('common');
  const { count } = useStore();
  const [evt, setEvt] = React.useState<InstallEvent | null>(null);
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const s = read();
    write({ ...s, visits: s.visits + 1 });
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => write({ ...read(), installed: true });
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  React.useEffect(() => {
    if (!evt) return;
    const s = read();
    const engaged = s.visits >= 3 || count > 0;
    const snoozed = s.dismissed && Date.now() - s.dismissed < 30 * 86_400_000;
    if (!engaged || snoozed || s.installed) return;
    const id = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(id);
  }, [evt, count]);

  if (!show || !evt) return null;
  return (
    <div role="dialog" aria-label={t('installTitle')} className="fixed inset-x-3 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+12px)] z-[var(--z-toast)] mx-auto max-w-md rounded-[18px] bg-bg-elevated p-4 shadow-3 ring-1 ring-line animate-fade-up md:bottom-6">
      <div className="flex gap-3">
        <CrestMark className="h-11 shrink-0 text-accent" />
        <div className="flex-1">
          <p className="t-body font-medium">{t('installTitle')}</p>
          <p className="t-caption text-ink-2">{t('installBody')}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            write({ ...read(), dismissed: Date.now() });
            setShow(false);
          }}
        >
          {t('notNow')}
        </Button>
        <Button
          size="sm"
          onClick={async () => {
            await evt.prompt();
            const r = await evt.userChoice;
            write({ ...read(), ...(r.outcome === 'accepted' ? { installed: true } : { dismissed: Date.now() }) });
            setShow(false);
          }}
        >
          {t('install')}
        </Button>
      </div>
    </div>
  );
}
