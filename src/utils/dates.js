import {
  addDays,
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isToday,
  parseISO,
  startOfDay,
} from 'date-fns'

export const toDate = (value) => {
  if (!value) return null
  return value instanceof Date ? value : parseISO(value)
}

export const formatDateTime = (value) => {
  const date = toDate(value)
  return date ? format(date, 'MMM d, yyyy h:mm a') : 'No date'
}

export const formatDate = (value) => {
  const date = toDate(value)
  return date ? format(date, 'MMM d, yyyy') : 'No date'
}

export const formatInputDateTime = (value) => {
  const date = toDate(value)
  return date ? format(date, "yyyy-MM-dd'T'HH:mm") : ''
}

export const isOverdue = (task) =>
  task.due_at && task.status !== 'Completed' && isBefore(toDate(task.due_at), new Date())

export const isDueToday = (task) => task.due_at && isToday(toDate(task.due_at))

export const timeRemaining = (value) => {
  const date = toDate(value)
  if (!date) return ''
  if (isBefore(date, new Date())) return 'Expired'
  return `${formatDistanceToNow(date)} left`
}

export const expiryFromNow = (days = 7) => addDays(new Date(), days).toISOString()

export const greetingForNow = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export const weekProgress = (tasks) => {
  const today = startOfDay(new Date())
  const recent = tasks.filter((task) => {
    const source = toDate(task.completed_at || task.updated_at || task.created_at)
    return source && differenceInCalendarDays(today, startOfDay(source)) <= 6
  })
  if (!recent.length) return 0
  return Math.round((recent.filter((task) => task.status === 'Completed').length / recent.length) * 100)
}

export const normalizeDateRange = ({ start_at, due_at }) => {
  if (start_at && due_at && isAfter(toDate(start_at), toDate(due_at))) {
    return 'Start date must be before the due date.'
  }
  return ''
}
