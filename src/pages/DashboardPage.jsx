import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Camera, NotebookPen, Plus } from 'lucide-react'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import CloudPuppy from '../components/mascot/CloudPuppy'
import { useCozyData } from '../hooks/useCozyData'
import { formatDateTime, greetingForNow, isDueToday, isOverdue, weekProgress } from '../utils/dates'

export default function DashboardPage() {
  const data = useCozyData()
  const tasks = data?.tasks || []
  const notes = data?.notes || []
  const moments = data?.moments || []
  const today = tasks.filter(isDueToday)
  const overdue = tasks.filter(isOverdue)
  const upcoming = tasks.filter((task) => task.due_at && task.status !== 'Completed' && !isOverdue(task)).slice(0, 5)
  const completedCount = tasks.filter((task) => task.status === 'Completed').length

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 rounded-[2rem] bg-mist p-5 shadow-cozy md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-sm font-extrabold text-slate">{format(new Date(), 'EEEE, MMMM d')}</p>
          <h1 className="mt-2 text-3xl font-black text-navy sm:text-4xl">{greetingForNow()}! Ready for a cozy and productive day?</h1>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/tasks" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-navy px-4 py-2 text-sm font-extrabold text-white">
              <Plus size={18} /> Task
            </Link>
            <Link to="/notes" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2 text-sm font-extrabold text-navy">
              <NotebookPen size={18} /> Note
            </Link>
            <Link to="/moments" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2 text-sm font-extrabold text-navy">
              <Camera size={18} /> Moment
            </Link>
          </div>
        </div>
        <CloudPuppy className="w-32 self-center" />
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-sm font-bold text-slate">Today</p><p className="text-3xl font-black">{today.length}</p></Card>
        <Card><p className="text-sm font-bold text-slate">Overdue</p><p className="text-3xl font-black text-red-600">{overdue.length}</p></Card>
        <Card><p className="text-sm font-bold text-slate">Completed</p><p className="text-3xl font-black text-emerald-700">{completedCount}</p></Card>
        <Card><p className="text-sm font-bold text-slate">Weekly progress</p><p className="text-3xl font-black">{weekProgress(tasks)}%</p></Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-xl font-black">Upcoming deadlines</h2>
          {upcoming.length ? (
            <div className="grid gap-3">
              {upcoming.map((task) => (
                <Link key={task.id} to={`/tasks?task=${task.id}`} className="block rounded-2xl bg-cloud p-3 transition hover:bg-mist focus-visible:bg-mist">
                  <p className="font-extrabold">{task.title}</p>
                  <p className="text-sm font-bold text-slate">{formatDateTime(task.due_at)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No deadlines hovering nearby">Add a task with a due date when something needs a gentle nudge.</EmptyState>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-xl font-black">Recent notes and moments</h2>
          <div className="grid gap-3">
            {[...notes.slice(0, 3).map((item) => ({ ...item, cozyType: 'note' })), ...moments.slice(0, 3).map((item) => ({ ...item, cozyType: 'moment' }))].slice(0, 5).map((item) => (
              <Link
                key={`${item.cozyType}-${item.id}`}
                to={item.cozyType === 'note' ? `/notes?note=${item.id}` : `/moments?moment=${item.id}`}
                className="block rounded-2xl bg-cloud p-3 transition hover:bg-mist focus-visible:bg-mist"
              >
                <p className="font-extrabold">{item.title || item.caption || 'Photo-only moment'}</p>
                <p className="text-sm font-bold text-slate">{formatDateTime(item.updated_at || item.uploaded_at)}</p>
              </Link>
            ))}
            {!notes.length && !moments.length && <EmptyState title="Nothing saved yet">Your notebook and photo diary will appear here as you use CozyDay.</EmptyState>}
          </div>
        </Card>
      </div>
    </div>
  )
}
