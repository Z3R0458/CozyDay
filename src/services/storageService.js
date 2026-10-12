const LOCAL_KEY = 'cozyday-local-state'

const defaultState = {
  categories: [
    { id: 'cat-school', name: 'School', color: '#E7F5FF', created_at: new Date().toISOString() },
    { id: 'cat-projects', name: 'Projects', color: '#E7E2FF', created_at: new Date().toISOString() },
    { id: 'cat-personal', name: 'Personal', color: '#FFDCE8', created_at: new Date().toISOString() },
  ],
  tasks: [],
  notes: [],
  moments: [],
  taskReminders: [],
  notificationPreferences: {
    enabled: false,
    browser_notifications: false,
    reminder_minutes: 30,
  },
  profile: { display_name: 'Cozy friend' },
}

export const readLocalState = () => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState
  } catch {
    return defaultState
  }
}

export const writeLocalState = (state) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state))
}

export const createId = (prefix) =>
  `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
