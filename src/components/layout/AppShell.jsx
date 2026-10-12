import {
  Bell,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Home,
  Images,
  LogOut,
  Menu,
  Moon,
  NotebookPen,
  Settings,
  X,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { createElement, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Button from '../common/Button'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/moments', label: 'Moments', icon: Images },
  { to: '/reminders', label: 'Reminders', icon: Bell },
  { to: '/categories', label: 'Projects', icon: FolderKanban },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function NavItems({ onNavigate }) {
  return (
    <nav className="grid gap-1" aria-label="Main navigation">
      {navItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-extrabold transition ${
              isActive ? 'bg-mist text-navy shadow-sm' : 'text-slate hover:bg-white/80 hover:text-navy'
            }`
          }
        >
          {createElement(icon, { size: 20, 'aria-hidden': 'true' })}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default function AppShell() {
  const { signOut, user, isConfigured } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-cloud/90 backdrop-blur lg:hidden">
        <div className="flex min-h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-extrabold text-navy">
            <Moon className="text-sky" aria-hidden="true" />
            CozyDay
          </div>
          <Button variant="ghost" className="h-11 w-11 rounded-full px-0" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </Button>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border bg-cloud/90 p-5 backdrop-blur lg:block">
        <div className="mb-8 flex items-center gap-3 rounded-[1.5rem] bg-white p-3 shadow-cozy">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-mist text-sky">
            <Moon aria-hidden="true" />
          </div>
          <div>
            <p className="text-xl font-black text-navy">CozyDay</p>
            <p className="text-xs font-bold text-slate">Private planner</p>
          </div>
        </div>
        <NavItems />
        <div className="absolute bottom-5 left-5 right-5 grid gap-3">
          {!isConfigured && (
            <p className="rounded-2xl bg-butter/70 p-3 text-xs font-bold text-navy">
              Demo mode is using local browser storage until Supabase env vars are added.
            </p>
          )}
          <Button variant="secondary" onClick={signOut}>
            <LogOut size={18} /> Logout
          </Button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 bg-deep/30 lg:hidden" role="dialog" aria-modal="true">
          <div className="h-full w-[min(22rem,88vw)] bg-cloud p-5 shadow-cozy">
            <div className="mb-5 flex items-center justify-between">
              <strong className="text-lg text-navy">CozyDay</strong>
              <Button variant="ghost" className="h-11 w-11 rounded-full px-0" onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={22} />
              </Button>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-5 lg:ml-72 lg:px-8">
        <div className="mb-5 hidden items-center justify-between lg:flex">
          <div>
            <p className="text-sm font-bold text-slate">Signed in as</p>
            <p className="font-extrabold text-navy">{user?.email}</p>
          </div>
        </div>
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-cloud/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
        <div className="grid grid-cols-5 gap-1">
          {navItems.slice(0, 5).map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `grid min-h-14 place-items-center rounded-2xl text-[0.68rem] font-extrabold ${
                  isActive ? 'bg-mist text-navy' : 'text-slate'
                }`
              }
            >
              {createElement(icon, { size: 20, 'aria-hidden': 'true' })}
              <span>{label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
