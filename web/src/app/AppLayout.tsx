import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Me } from '@contracts/api-types';
import { Icon } from '../components/ui/Icon';
import { Logo } from '../components/ui/Logo';
import { ago, initials } from '../lib/format';
import { useTheme } from '../lib/theme';
import { useRealtime } from '../lib/realtime';
import { useLogout } from '../modules/auth/auth.api';
import { useBranches, usePendingAgencies } from '../modules/agencies/agencies.api';
import { parcelsFirstPage, useParcelStats } from '../modules/parcels/parcels.api';
import { ROLE_LABEL, visibleNav, type NavItem } from './nav';

const OFFICE = ['COUNTER_AGENT', 'BRANCH_MANAGER', 'AGENCY_OWNER'];

// The dashboard frame from the design: white rounded sidebar on the left, top bar and page on the right.
// On a computer the sidebar stays in place while the page scrolls (sticky); it scrolls on its own if the window is short.
// Below 900 px it becomes a drawer opened by the menu button.
export function AppLayout({ me, nav, bottom, admin = false }: { me: Me; nav: NavItem[]; bottom: NavItem[]; admin?: boolean }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  const office = !admin && OFFICE.includes(me.role);
  useRealtime(me);
  const stats = useParcelStats(office);
  const pending = usePendingAgencies(admin);
  const badges: Record<NonNullable<NavItem['badge']>, number> = {
    parcelAlerts: stats.data?.alerts.length ?? 0,
    pendingAgencies: pending.data?.length ?? 0,
  };

  return (
    <div className="flex min-h-screen items-start gap-5 bg-canvas p-5 max-[900px]:flex-col max-[900px]:items-stretch max-[900px]:gap-3 max-[900px]:p-3">
      <Sidebar me={me} items={visibleNav(nav, me.role)} bottom={bottom} badges={badges} admin={admin} open={open} onClose={() => setOpen(false)} />
      <main className="flex min-w-0 flex-1 flex-col gap-[18px] pb-6">
        <TopBar me={me} admin={admin} office={office} onMenu={() => setOpen(true)} />
        {/* key = the page: each new page fades in, the same page with other filters does not */}
        <div key={pathname} className="tp-page flex min-w-0 flex-col gap-[18px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const linkClass = (active: boolean) =>
  `flex items-center gap-3 rounded-[14px] px-3.5 py-[11px] text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ${
    active ? 'bg-primary text-white shadow-[0_6px_16px_rgba(30,79,216,0.25)] hover:text-white' : 'text-body hover:bg-soft hover:text-ink'
  }`;

function Sidebar({ me, items, bottom, badges, admin, open, onClose }: {
  me: Me;
  items: NavItem[];
  bottom: NavItem[];
  badges: Record<string, number>;
  admin: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const logout = useLogout();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const branches = useBranches(!admin && !!me.agency);
  const branch = branches.data?.find((b) => b.id === me.employee?.branchId);

  // Load a page's data while the pointer is on its link: it opens with its content, no skeleton
  const prefetch = (to: string) => {
    if (to === '/parcels') void qc.prefetchQuery(parcelsFirstPage);
  };

  const navLink = (item: NavItem) => {
    const count = item.badge ? badges[item.badge] : 0;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/' || item.to === '/admin'}
        onMouseEnter={() => prefetch(item.to)}
        onFocus={() => prefetch(item.to)}
        className={({ isActive }) => linkClass(isActive)}
      >
        {({ isActive }) => (
          <>
            <Icon name={item.icon} />
            <span className="flex-1">{item.label}</span>
            {count > 0 && (
              <span className={`tp-fade rounded-md px-[7px] py-px text-[11px] font-extrabold ${isActive ? 'bg-surface text-primary' : 'bg-primary text-white'}`} aria-label={`${count} to look at`}>
                {count}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 min-[901px]:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`tp-scroll flex w-[232px] shrink-0 flex-col gap-[26px] overflow-y-auto rounded-3xl bg-surface px-4 pb-5 pt-7 min-[901px]:sticky min-[901px]:top-5 min-[901px]:h-[calc(100vh-40px)] max-[900px]:fixed max-[900px]:inset-y-3 max-[900px]:left-3 max-[900px]:z-40 max-[900px]:shadow-2xl max-[900px]:transition-transform max-[900px]:duration-300 ${
          open ? 'max-[900px]:translate-x-0' : 'max-[900px]:-translate-x-[110%]'
        }`}
      >
        <Link to={admin ? '/admin' : '/'} className="px-2.5" aria-label="TransitPro, home">
          <Logo size={38} />
        </Link>

        <div className="flex items-center gap-2.5 rounded-[14px] border border-line bg-soft px-3 py-2.5">
          <span
            className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[13px] font-extrabold ${
              admin ? 'bg-primary-tint text-primary-dark' : 'bg-warning-tint text-warning'
            }`}
          >
            {admin ? <Icon name="shield" size={18} /> : initials(me.agency?.name ?? '?')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink">{admin ? 'TransitPro team' : me.agency?.name}</span>
            <span className="block truncate text-xs text-muted">
              {admin ? 'Platform admin' : branch ? `${branch.city} · ${branch.name} branch` : me.role === 'AGENCY_OWNER' ? 'All branches' : ROLE_LABEL[me.role]}
            </span>
          </span>
        </div>

        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {items.map(navLink)}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5">
          {bottom.map(navLink)}
          <button
            type="button"
            onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
            disabled={logout.isPending}
            className={linkClass(false) + ' text-left'}
          >
            <Icon name="out" />
            {logout.isPending ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>
    </>
  );
}

// Closes a popover on an outside click or Escape
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', click);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function TopBar({ me, admin, office, onMenu }: { me: Me; admin: boolean; office: boolean; onMenu: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const user = usePopover();
  const logout = useLogout();
  const theme = useTheme();

  // Tracking codes and phones: the parcel list does the search
  function search(e: FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (v) navigate(`/parcels?q=${encodeURIComponent(v)}`);
  }

  return (
    <header className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={onMenu} aria-label="Open menu" className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-surface text-ink min-[901px]:hidden">
        <Icon name="menu" />
      </button>
      {office && (
        <form onSubmit={search} role="search" className="flex h-[50px] min-w-0 flex-[0_1_420px] items-center gap-2.5 rounded-full bg-surface px-[18px] ring-primary/30 transition-shadow focus-within:ring-2">
          <Icon name="search" size={18} className="text-muted" />
          <label htmlFor="global-search" className="sr-only">
            Search parcels
          </label>
          <input
            id="global-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tracking code or phone…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </form>
      )}
      <div className="flex-1" />
      {!admin && <Messages />}
      {(office || admin) && <Notifications admin={admin} />}
      <div ref={user.ref} className="relative">
        <button
          type="button"
          onClick={() => user.setOpen((v) => !v)}
          aria-expanded={user.open}
          aria-haspopup="menu"
          className="flex h-[50px] items-center gap-2.5 rounded-full bg-surface py-0 pl-1.5 pr-3.5 transition-shadow hover:shadow-[0_4px_14px_rgba(14,23,38,0.08)]"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-primary-tint text-sm font-extrabold text-primary-dark">{initials(me.fullName)}</span>
          <span className="text-left max-sm:hidden">
            <span className="block text-sm font-bold text-ink">{me.fullName}</span>
            <span className="block text-xs text-muted">{me.employee?.jobTitle ?? ROLE_LABEL[me.role]}</span>
          </span>
          <Icon name="chevronDown" size={16} strokeWidth={2} className={`text-muted transition-transform duration-200 ${user.open ? 'rotate-180' : ''}`} />
        </button>
        {user.open && (
          <div role="menu" className="tp-pop absolute right-0 top-[58px] z-20 w-64 rounded-2xl border border-line bg-surface p-2 shadow-[0_12px_40px_rgba(14,23,38,0.14)] dark-pop">
            <div className="px-3 py-2">
              <div className="truncate text-sm font-bold text-ink">{me.email}</div>
              <div className="text-xs text-muted">{ROLE_LABEL[me.role]}</div>
            </div>
            <div className="my-1 h-px bg-line" />
            <button
              role="menuitemcheckbox"
              aria-checked={theme.dark}
              type="button"
              onClick={() => theme.setTheme(theme.dark ? 'light' : 'dark')}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-body transition-colors hover:bg-soft"
            >
              <Icon name={theme.dark ? 'moon' : 'sun'} size={18} />
              <span className="flex-1">Dark mode</span>
              <span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${theme.dark ? 'bg-primary' : 'bg-field'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] duration-200 ${theme.dark ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
            <Link
              role="menuitem"
              to={admin ? '/admin/settings' : '/settings'}
              onClick={() => user.setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-body transition-colors hover:bg-soft hover:text-ink"
            >
              <Icon name="gear" size={18} /> Settings
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-body transition-colors hover:bg-soft"
            >
              <Icon name="out" size={18} /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

// The bell: parcel alerts for agency staff, agencies waiting for verification for the TransitPro team.
// Same cached data as the dashboard and the sidebar badge: opening it costs no request.
function Notifications({ admin }: { admin: boolean }) {
  const pop = usePopover();
  const stats = useParcelStats(!admin);
  const pending = usePendingAgencies(admin);
  const navigate = useNavigate();

  const items: { key: string; title: string; text: string; at: string; to: string }[] = admin
    ? (pending.data ?? []).map((a) => ({ key: a.id, title: a.name, text: `Waiting for verification · ${a.headOffice}`, at: a.createdAt, to: '/admin/verify' }))
    : (stats.data?.alerts ?? []).map((a) => ({
        key: a.trackingCode + a.kind,
        title: `${a.kind === 'ON_HOLD' ? 'On hold' : a.kind === 'CLAIM' ? 'Claim open' : 'Late delivery'} · ${a.trackingCode}`,
        text: a.text,
        at: a.at,
        to: `/parcels/${a.trackingCode}`,
      }));

  return (
    <div ref={pop.ref} className="relative">
      <button
        type="button"
        onClick={() => pop.setOpen((v) => !v)}
        aria-expanded={pop.open}
        aria-label={items.length ? `Notifications, ${items.length} new` : 'Notifications'}
        className="relative flex h-[50px] w-[50px] items-center justify-center rounded-full bg-surface text-ink transition-shadow hover:shadow-[0_4px_14px_rgba(14,23,38,0.08)]"
      >
        <Icon name="bell" />
        {items.length > 0 && <span className="tp-fade absolute right-[14px] top-3 h-2 w-2 rounded-full bg-[#e5484d]" />}
      </button>
      {pop.open && (
        <div className="tp-pop absolute right-0 top-[58px] z-20 w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-line bg-surface p-2 shadow-[0_12px_40px_rgba(14,23,38,0.14)] dark-pop">
          <div className="px-3 pb-1 pt-2 text-sm font-bold text-ink">{admin ? 'Agencies to verify' : 'Parcel alerts'}</div>
          {items.length === 0 ? (
            <p className="px-3 pb-3 pt-1 text-sm text-muted">Nothing needs you right now.</p>
          ) : (
            <ul className="flex flex-col">
              {items.map((n) => (
                <Item
                  key={n.key}
                  onClick={() => {
                    pop.setOpen(false);
                    navigate(n.to);
                  }}
                >
                  <span className="block text-[13px] font-bold text-ink">{n.title}</span>
                  <span className="block truncate text-[13px] text-body">{n.text}</span>
                  <span className="block text-xs text-muted">{ago(n.at)}</span>
                </Item>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// The design's messages button. No messaging module yet: it opens on its first-day state.
// Messages module (to assign): put the unread count on the dot and the last conversations in the list.
function Messages() {
  const pop = usePopover();
  return (
    <div ref={pop.ref} className="relative">
      <button
        type="button"
        onClick={() => pop.setOpen((v) => !v)}
        aria-expanded={pop.open}
        aria-label="Messages"
        className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-surface text-ink transition-shadow hover:shadow-[0_4px_14px_rgba(14,23,38,0.08)]"
      >
        <Icon name="chat" />
      </button>
      {pop.open && (
        <div className="tp-pop absolute right-0 top-[58px] z-20 w-[300px] max-w-[calc(100vw-24px)] rounded-2xl border border-line bg-surface p-2 shadow-[0_12px_40px_rgba(14,23,38,0.14)] dark-pop">
          <div className="px-3 pb-1 pt-2 text-sm font-bold text-ink">Messages</div>
          <p className="px-3 pb-3 pt-1 text-sm text-muted">No messages yet. Conversations with your branches and drivers will show here.</p>
        </div>
      )}
    </div>
  );
}

function Item({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-soft">
        {children}
      </button>
    </li>
  );
}

// Page title row used by every page: title, subtitle, actions on the right
export function PageHeader({ title, subtitle, crumbs, actions }: { title: string; subtitle?: ReactNode; crumbs?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {crumbs && <div className="text-[13px] font-semibold text-muted">{crumbs}</div>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-[1_1_320px]">
          <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}
