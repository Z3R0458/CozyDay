import { useEffect, useMemo, useState } from 'react'
import { isAfter, isBefore, parseISO } from 'date-fns'

const deliveredKey = 'cozyday-delivered-reminders'

const readDelivered = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(deliveredKey) || '[]'))
  } catch {
    return new Set()
  }
}

const saveDelivered = (set) => localStorage.setItem(deliveredKey, JSON.stringify([...set]))

export function useReminders(tasks = [], preferences) {
  const [permission, setPermission] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [activeReminder, setActiveReminder] = useState(null)

  const upcoming = useMemo(() => {
    const now = new Date()
    return tasks
      .filter((task) => task.reminder_at && task.status !== 'Completed' && isAfter(parseISO(task.reminder_at), now))
      .sort((a, b) => parseISO(a.reminder_at) - parseISO(b.reminder_at))
  }, [tasks])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const delivered = readDelivered()
      const now = new Date()
      const due = tasks.find((task) => {
        if (!task.reminder_at || task.status === 'Completed' || delivered.has(task.id)) return false
        const reminderTime = parseISO(task.reminder_at)
        return isBefore(reminderTime, now) || reminderTime.getTime() === now.getTime()
      })
      if (!due) return
      delivered.add(due.id)
      saveDelivered(delivered)
      setActiveReminder(due)
      if (preferences?.browser_notifications && permission === 'granted') {
        new Notification('CozyDay reminder', { body: due.title })
      }
    }, 30000)
    return () => window.clearInterval(interval)
  }, [permission, preferences?.browser_notifications, tasks])

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported')
      return 'unsupported'
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }

  return { upcoming, activeReminder, setActiveReminder, permission, requestPermission }
}
