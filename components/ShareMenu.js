'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

/** Share a job: native share sheet on phones, otherwise WhatsApp / LinkedIn / copy link. */
export default function ShareMenu({ title, path }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(path);
  const ref = useRef(null);
  useEffect(() => { setUrl(new URL(path, window.location.origin).toString()); }, [path]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  async function onClick() {
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title, url }); return; } catch { /* cancelled */ }
    }
    setOpen((o) => !o);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }
  const text = encodeURIComponent(`${title} ${url}`);
  const item = 'flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-brand-50';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={onClick} aria-expanded={open} aria-label="Share this job" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-canvas-100 hover:text-brand-500">
        <Icon name="share" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl bg-white py-1 shadow-raised">
          <a className={item} href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener">WhatsApp</a>
          <a className={item} href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener">LinkedIn</a>
          <a className={item} href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener">Telegram</a>
          <button type="button" className={item} onClick={copy}><Icon name={copied ? 'check' : 'link'} className="h-4 w-4" />{copied ? 'Link copied' : 'Copy link'}</button>
        </div>
      )}
    </div>
  );
}
