import { useEffect, useRef, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import type { Me } from '@contracts/api-types';
import { Icon } from '../components/ui/Icon';
import { Logo } from '../components/ui/Logo';
import { initials } from '../lib/format';
import { useLogout } from '../modules/auth/auth.api';
import { useBranches } from '../modules/agencies/agencies.api';
import { ROLE_LABEL, visibleNav, type NavItem } from './nav';

// The dashboard frame from the design: white rounded sidebar on the left, top bar and page on the right.
// Below 900 px the sidebar becomes a drawer opened by the menu button.
export function AppLayout({ me, nav, admin = false }: { me: Me; nav: NavItem[]; admin?: boolean }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  const items = visibleNav(nav, me.role);

  return (
    <div className="flex min-h-screen gap-5 bg-canvas p-5 max-[900px]:flex-col max-[900px]:gap-3 max-[900px]:p-3">
      <Sidebar me={me} items={items} admin={admin} open={open} onClose={() => setOpen(false)} />
      <main className="flex min-w-0 flex-1 flex-col gap-[18px] pb-6">
        <TopBar me={me} admin={admin} onMenu={() => setOpen(true)} />
        <Outlet />
      </main>
    </div>
  );
}

function Sidebar({ me, items, admin, open, onClose }: { me: Me; items: NavItem[]; admin: boolean; open: boolean; onClose: () => void }) {
  const logout = useLogout();
  const navigate = useNavigate();
  const branches = useBranches(!admin && !!me.agency);
  const branch = branches.data?.find((b) => b.id === me.employee?.branchId);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink/40 min-[901px]:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`flex w-[232px] shrink-0 flex-col gap-[26px] rounded-3xl bg-white px-4 pb-5 pt-7 max-[900px]:fixed max-[900px]:inset-y-3 max-[900px]:left-3 max-[900px]:z-40 max-[900px]:overflow-y-auto max-[900px]:shadow-2xl max-[900px]:transition-transform ${
          open ? 'max-[900px]:translate-x-0' : 'max-[900px]:-translate-x-[110%]'
        }`}
      >
        <div className="px-2">
          <Logo />
        </div>
        <div className="rounded-xl border border-line px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-muted">{admin ? 'Workspace' : 'Agency'}</div>
          <div className="mt-0.5 truncate text-sm font-bold text-ink">{admin ? 'TransitPro team' : me.agency?.name}</div>
          <div className="truncate text-xs text-muted">
            {admin ? 'Platform admin' : branch ? `${branch.city} · ${branch.name} branch` : me.role === 'AGENCY_OWNER' ? 'All branches' : ' '}
          </div>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[14px] px-3.5 py-[11px] text-sm font-semibold transition-colors ${
                  isActive ? 'bg-primary text-white hover:text-white' : 'text-body hover:bg-soft hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  {item.soon && (
                    <span className={`rounded-md px-1.5 py-px text-[10px] font-extrabold uppercase ${isActive ? 'bg-white/20 text-white' : 'bg-chip text-muted'}`}>soon</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
            disabled={logout.isPending}
            className="flex items-center gap-3 rounded-[14px] px-3.5 py-[11px] text-left text-sm font-semibold text-body hover:bg-soft hover:text-ink"
          >
            <Icon name="out" />
            {logout.isPending ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>
    </>
  );
}

function TopBar({ me, admin, onMenu }: { me: Me; admin: boolean; onMenu: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const logout = useLogout();

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  // Tracking codes and phones: the parcel list does the search
  function search(e: FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (v) navigate(`/parcels?q=${encodeURIComponent(v)}`);
  }
  const canSearch = !admin && (me.role === 'COUNTER_AGENT' || me.role === 'BRANCH_MANAGER' || me.role === 'AGENCY_OWNER');

  return (
    <header className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={onMenu} aria-label="Open menu" className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-white text-ink min-[901px]:hidden">
        <Icon name="menu" />
      </button>
      {canSearch && (
        <form onSubmit={search} role="search" className="flex h-[50px] min-w-0 flex-[0_1_420px] items-center gap-2.5 rounded-full bg-white px-[18px]">
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
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-expanded={menu}
          aria-haspopup="menu"
          className="flex h-[50px] items-center gap-2.5 rounded-full bg-white py-0 pl-1.5 pr-3.5"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-primary-tint text-sm font-extrabold text-primary-dark">{initials(me.fullName)}</span>
          <span className="text-left max-sm:hidden">
            <span className="block text-sm font-bold text-ink">{me.fullName}</span>
            <span className="block text-xs text-muted">{me.employee?.jobTitle ?? ROLE_LABEL[me.role]}</span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6576" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {menu && (
          <div role="menu" className="absolute right-0 top-[58px] z-20 w-64 rounded-2xl border border-line bg-white p-2 shadow-[0_12px_40px_rgba(14,23,38,0.14)]">
            <div className="px-3 py-2">
              <div className="truncate text-sm font-bold text-ink">{me.email}</div>
              <div className="text-xs text-muted">{ROLE_LABEL[me.role]}</div>
            </div>
            <div className="my-1 h-px bg-line" />
            <button
              role="menuitem"
              type="button"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-body hover:bg-soft"
            >
              <Icon name="out" size={18} /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

// Page title row used by every page: title, subtitle, actions on the right
export function PageHeader({ title, subtitle, crumbs, actions }: { title: string; subtitle?: React.ReactNode; crumbs?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {crumbs && <div className="text-[13px] font-semibold text-muted">{crumbs}</div>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-[1_1_320px]">
          <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}
