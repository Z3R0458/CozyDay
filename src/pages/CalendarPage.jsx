import { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import Card from '../components/common/Card'
import { Field, inputClass } from '../components/common/Field'
import Button from '../components/common/Button'
import { useCozyData } from '../hooks/useCozyData'

export default function CalendarPage() {
  const data = useCozyData()
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [selectedDate, setSelectedDate] = useState('')
  const [title, setTitle] = useState('')
  const events = useMemo(
    () =>
      (data.tasks || []).flatMap((task) => {
        const items = []
        if (task.start_at || task.due_at) {
          items.push({
            id: task.id,
            title: task.title,
            start: task.start_at || task.due_at,
            end: task.due_at || task.start_at,
            backgroundColor: task.status === 'Completed' ? '#D9F5E5' : task.priority === 'Urgent' ? '#ef4444' : '#91D5FF',
            borderColor: task.priority === 'Urgent' ? '#ef4444' : '#17345C',
            textColor: task.priority === 'Urgent' ? '#ffffff' : '#17345C',
          })
        }
        return items
      }),
    [data.tasks],
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const quickAdd = async (event) => {
    event.preventDefault()
    if (!title.trim() || !selectedDate) return
    await data.saveTask({
      title,
      priority: 'Medium',
      status: 'Not Started',
      due_at: new Date(selectedDate).toISOString(),
      checklist: [],
    })
    setTitle('')
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-black">Calendar</h1>
        <p className="text-sm font-bold text-slate">Tasks stay synchronized here as deadlines and start times change.</p>
      </div>
      <Card as="form" onSubmit={quickAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <Field label="Selected date"><input className={inputClass} type="datetime-local" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></Field>
        <Field label="Task title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Create from calendar" /></Field>
        <Button type="submit" className="w-full sm:col-span-2 lg:col-span-1">Add task</Button>
      </Card>
      <Card className="overflow-hidden">
        <div className="cozy-calendar">
          <FullCalendar
            key={isMobile ? 'mobile-calendar' : 'desktop-calendar'}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
            headerToolbar={
              isMobile
                ? {
                    left: 'title',
                    center: '',
                    right: 'prev,next',
                  }
                : {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                  }
            }
            footerToolbar={
              isMobile
                ? {
                    left: 'today',
                    center: '',
                    right: 'listWeek,timeGridDay',
                  }
                : false
            }
            buttonText={{
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              list: 'List',
            }}
            selectable
            editable
            events={events}
            select={(info) => setSelectedDate(info.startStr.slice(0, 16))}
            eventDrop={(info) => data.saveTask({ ...(data.tasks || []).find((task) => task.id === info.event.id), due_at: info.event.start.toISOString() })}
            eventClick={(info) => {
              const task = (data.tasks || []).find((item) => item.id === info.event.id)
              if (task) window.alert(`${task.title}\nStatus: ${task.status}\nPriority: ${task.priority}`)
            }}
            height="auto"
            dayMaxEvents={2}
          />
        </div>
      </Card>
    </div>
  )
}
