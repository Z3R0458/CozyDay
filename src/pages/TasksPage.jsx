import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, FilterX, Plus, Search, Trash2 } from 'lucide-react'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import { Field, inputClass } from '../components/common/Field'
import StatusMessage from '../components/common/StatusMessage'
import { useCozyData } from '../hooks/useCozyData'
import { formatDateTime, formatInputDateTime, isOverdue } from '../utils/dates'

const emptyTask = {
  title: '',
  description: '',
  category_id: '',
  priority: 'Medium',
  status: 'Not Started',
  start_at: '',
  due_at: '',
  reminder_at: '',
  reminder_preset_minutes: '',
  recurrence_rule: '',
  checklist: [],
}

const reminderPresets = [
  { value: '', label: 'No reminder' },
  { value: 'exact', label: 'At an exact time' },
  { value: '0', label: 'At the due time' },
  { value: '5', label: '5 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
]

export default function TasksPage() {
  const data = useCozyData()
  const [searchParams] = useSearchParams()
  const selectedTaskId = searchParams.get('task')
  const [draft, setDraft] = useState(emptyTask)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ status: 'All', priority: 'All', category_id: 'All', sort: 'due_at' })
  const [formMessage, setFormMessage] = useState('')
  const [listMessage, setListMessage] = useState('')
  const [checkText, setCheckText] = useState('')

  const tasks = useMemo(() => {
    const score = { Urgent: 4, High: 3, Medium: 2, Low: 1 }
    return (data?.tasks || [])
      .filter((task) => task.title.toLowerCase().includes(query.toLowerCase()))
      .filter((task) => filters.status === 'All' || task.status === filters.status)
      .filter((task) => filters.priority === 'All' || task.priority === filters.priority)
      .filter((task) => filters.category_id === 'All' || task.category_id === filters.category_id)
      .sort((a, b) => {
        if (selectedTaskId) {
          if (a.id === selectedTaskId) return -1
          if (b.id === selectedTaskId) return 1
        }
        if (filters.sort === 'priority') return score[b.priority] - score[a.priority]
        if (filters.sort === 'created_at') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
        return new Date(a.due_at || '2999-01-01') - new Date(b.due_at || '2999-01-01')
      })
  }, [data?.tasks, filters, query, selectedTaskId])

  useEffect(() => {
    if (!selectedTaskId) return
    setFilters({ status: 'All', priority: 'All', category_id: 'All', sort: 'due_at' })
    setQuery('')
    window.requestAnimationFrame(() => document.getElementById(`task-${selectedTaskId}`)?.scrollIntoView({ block: 'center' }))
  }, [selectedTaskId])

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const save = async (event) => {
    event.preventDefault()
    setFormMessage('')
    const dueAt = draft.due_at ? new Date(draft.due_at) : null
    let reminderAt = draft.reminder_at ? new Date(draft.reminder_at).toISOString() : null
    if (draft.reminder_preset_minutes !== '' && draft.reminder_preset_minutes !== 'exact') {
      if (!dueAt) {
        setFormMessage('Choose a due date before using a reminder preset.')
        return
      }
      reminderAt = new Date(dueAt.getTime() - Number(draft.reminder_preset_minutes) * 60 * 1000).toISOString()
    }
    if (draft.reminder_preset_minutes === '') reminderAt = null
    try {
      await data.saveTask({
        ...draft,
        start_at: draft.start_at ? new Date(draft.start_at).toISOString() : null,
        due_at: dueAt ? dueAt.toISOString() : null,
        reminder_at: reminderAt,
        reminder_preset_minutes:
          draft.reminder_preset_minutes === '' || draft.reminder_preset_minutes === 'exact'
            ? null
            : Number(draft.reminder_preset_minutes),
      })
      setDraft(emptyTask)
      setCheckText('')
      setFormMessage('Task saved.')
    } catch (err) {
      setFormMessage(err.message)
    }
  }

  const edit = (task) =>
    setDraft({
      ...task,
      start_at: formatInputDateTime(task.start_at),
      due_at: formatInputDateTime(task.due_at),
      reminder_at: formatInputDateTime(task.reminder_at),
      reminder_preset_minutes: task.reminder_preset_minutes ?? (task.reminder_at ? 'exact' : ''),
      checklist: task.checklist || [],
    })

  const addChecklistItem = () => {
    if (!checkText.trim()) return
    setDraft((current) => ({
      ...current,
      checklist: [...(current.checklist || []), { id: crypto.randomUUID(), text: checkText.trim(), done: false }],
    }))
    setCheckText('')
  }

  const toggleComplete = async (task) => {
    setListMessage('')
    try {
      await data.saveTask({ ...task, status: task.status === 'Completed' ? 'In Progress' : 'Completed' })
      setListMessage(task.status === 'Completed' ? 'Task reopened.' : 'Task marked complete.')
    } catch (err) {
      setListMessage(err.message || 'Could not update task.')
    }
  }

  const resetFilters = () => {
    setQuery('')
    setFilters({ status: 'All', priority: 'All', category_id: 'All', sort: 'due_at' })
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <Card as="form" onSubmit={save} className="h-max">
        <h1 className="mb-4 text-2xl font-black">{draft.id ? 'Edit task' : 'Add task'}</h1>
        <div className="grid gap-4">
          <StatusMessage type={formMessage.includes('saved') ? 'success' : 'error'}>{formMessage}</StatusMessage>
          <Field label="Title"><input className={inputClass} value={draft.title} onChange={(e) => update('title', e.target.value)} required /></Field>
          <Field label="Description"><textarea className={`${inputClass} min-h-24`} value={draft.description || ''} onChange={(e) => update('description', e.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Priority"><select className={inputClass} value={draft.priority} onChange={(e) => update('priority', e.target.value)}>{data.priorities.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Status"><select className={inputClass} value={draft.status} onChange={(e) => update('status', e.target.value)}>{data.statuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
          </div>
          <Field label="Project"><select className={inputClass} value={draft.category_id || ''} onChange={(e) => update('category_id', e.target.value || null)}><option value="">None</option>{(data.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
          <Field label="Start"><input className={inputClass} type="datetime-local" value={draft.start_at || ''} onChange={(e) => update('start_at', e.target.value)} /></Field>
          <Field label="Due"><input className={inputClass} type="datetime-local" value={draft.due_at || ''} onChange={(e) => update('due_at', e.target.value)} /></Field>
          <Field label="Reminder preset">
            <select className={inputClass} value={draft.reminder_preset_minutes ?? ''} onChange={(e) => update('reminder_preset_minutes', e.target.value)}>
              {reminderPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
            </select>
          </Field>
          {draft.reminder_preset_minutes === 'exact' && (
            <Field label="Exact reminder time"><input className={inputClass} type="datetime-local" value={draft.reminder_at || ''} onChange={(e) => update('reminder_at', e.target.value)} /></Field>
          )}
          <Field label="Checklist">
            <div className="flex gap-2">
              <input className={inputClass} value={checkText} onChange={(e) => setCheckText(e.target.value)} />
              <Button variant="secondary" onClick={addChecklistItem}><Plus size={18} /></Button>
            </div>
          </Field>
          {!!draft.checklist?.length && <ul className="grid gap-2 text-sm font-bold">{draft.checklist.map((item) => <li key={item.id} className="rounded-xl bg-mist px-3 py-2">{item.text}</li>)}</ul>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="w-full sm:w-auto">{draft.id ? 'Save changes' : 'Create task'}</Button>
            {draft.id && <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setDraft(emptyTask)}>Cancel</Button>}
          </div>
        </div>
      </Card>
      <section className="grid content-start gap-4">
        <div>
          <h1 className="text-3xl font-black">My Tasks</h1>
          <p className="text-sm font-bold text-slate">Create, complete, search, filter, sort, and delete your school and personal work.</p>
        </div>
        <Card className="grid content-start gap-3 self-start">
          <StatusMessage type={listMessage.includes('complete') || listMessage.includes('reopened') ? 'success' : 'error'}>{listMessage}</StatusMessage>
          <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1.4fr)_repeat(4,minmax(8.25rem,1fr))_auto]">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate">Search</span>
              <Search className="absolute left-3 top-9 text-slate" size={18} />
              <input className={`${inputClass} pl-10`} placeholder="Search by title" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-slate">Status<select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option>All</option>{data.statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-slate">Priority<select className={inputClass} value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}><option>All</option>{data.priorities.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-slate">Project<select className={inputClass} value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}><option>All</option>{(data.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-slate">Sort<select className={inputClass} value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}><option value="due_at">Due date</option><option value="priority">Priority</option><option value="created_at">Created</option></select></label>
            <Button variant="secondary" className="w-full xl:w-11 xl:px-0" onClick={resetFilters} aria-label="Clear filters"><FilterX size={18} /><span className="xl:hidden">Clear filters</span></Button>
          </div>
        </Card>
        {tasks.length ? tasks.map((task) => (
          <Card key={task.id} id={`task-${task.id}`} className={`${isOverdue(task) ? 'border-red-200 bg-red-50/80' : ''} ${task.id === selectedTaskId ? 'ring-4 ring-sky/50' : ''}`}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 break-words text-xl font-black">{task.title}</h2>
                  <span className="rounded-full bg-mist px-3 py-1 text-xs font-black">{task.priority}</span>
                  <span className="rounded-full bg-mint px-3 py-1 text-xs font-black">{task.status}</span>
                  {isOverdue(task) && <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">Overdue</span>}
                </div>
                <p className="mt-1 text-sm font-bold text-slate">{task.description}</p>
                <p className="mt-2 text-sm font-extrabold">Due: {formatDateTime(task.due_at)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                <Button variant="soft" className="col-span-2 sm:col-span-1" onClick={() => toggleComplete(task)}><Check size={18} /> {task.status === 'Completed' ? 'Reopen' : 'Complete'}</Button>
                <Button variant="secondary" onClick={() => edit(task)}>Edit</Button>
                <Button variant="danger" onClick={() => window.confirm('Delete this task?') && data.deleteTask(task.id)}><Trash2 size={18} /></Button>
              </div>
            </div>
          </Card>
        )) : <EmptyState title="No matching tasks">Add your first task or loosen the filters.</EmptyState>}
      </section>
    </div>
  )
}
