import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from './Button';
import { Icon } from './Icon';

// Tools for list pages (status tabs, search, pages), same look as the Parcels list.
// Filters live in the URL: back button, refresh and shared links keep them.

export function useUrlFilters() {
  const [params, setParams] = useSearchParams();
  const get = (k: string) => params.get(k) ?? undefined;
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const set = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    setParams(p, { replace: true });
  };
  return { get, page, set };
}

export function FilterTabs<T extends string>({ tabs, value, onChange, label }: { tabs: { label: string; value?: T }[]; value?: T; onChange: (v?: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.label}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.value)}
            className={`h-9 rounded-full px-3.5 text-[13px] font-bold transition-colors ${active ? 'bg-inverse text-white' : 'bg-soft text-body hover:bg-chip'}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Searches while typing, 300 ms after the last key
export function SearchBox({ value, onSearch, placeholder }: { value?: string; onSearch: (v?: string) => void; placeholder: string }) {
  const [text, setText] = useState(value ?? '');
  useEffect(() => setText(value ?? ''), [value]);
  useEffect(() => {
    if (text === (value ?? '')) return;
    const t = setTimeout(() => onSearch(text.trim() || undefined), 300);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="ml-auto flex h-10 min-w-[220px] flex-[0_1_300px] items-center gap-2 rounded-full border border-field px-3.5 transition-shadow focus-within:ring-2 focus-within:ring-primary/30">
      <Icon name="search" size={16} className="text-muted" />
      <span className="sr-only">Search</span>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
    </label>
  );
}

export function Pager({ page, total, limit, noun, onPage }: { page: number; total: number; limit: number; noun: string; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
      <span className="text-muted">
        Page {page} of {pages} · {total} {noun}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
