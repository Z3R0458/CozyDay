/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { dataService } from '../services/dataService'
import { normalizeDateRange } from '../utils/dates'
import { useAuth } from './useAuth'

const DataContext = createContext(null)

const priorities = ['Low', 'Medium', 'High', 'Urgent']
const statuses = ['Not Started', 'In Progress', 'Completed']
const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageSize = 8 * 1024 * 1024

const withUser = (item, user) => ({ ...item, user_id: user?.id })

function validateTask(task) {
  if (!task.title?.trim()) return 'Task title is required.'
  if (!priorities.includes(task.priority)) return 'Choose a valid priority.'
  if (!statuses.includes(task.status)) return 'Choose a valid status.'
  return normalizeDateRange(task)
}

function validateImage(file) {
  if (!file) return 'Choose an image first.'
  if (!imageTypes.includes(file.type)) return 'Use a JPEG, PNG, or WebP image.'
  if (file.size > maxImageSize) return 'Images must be 8 MB or smaller.'
  return ''
}

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      setState(await dataService.getAll())
    } catch (err) {
      setError(err.message || 'Could not load CozyDay data.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const mutate = useCallback(
    async (work) => {
      setError('')
      try {
        const result = await work()
        await refresh()
        return result
      } catch (err) {
        setError(err.message || 'Something went wrong.')
        throw err
      }
    },
    [refresh],
  )

  const api = useMemo(
    () => ({
      ...state,
      priorities,
      statuses,
      loading,
      error,
      refresh,
      async saveTask(task) {
        const errorMessage = validateTask(task)
        if (errorMessage) throw new Error(errorMessage)
        const completed_at = task.status === 'Completed' ? task.completed_at || new Date().toISOString() : null
        return mutate(() => dataService.upsert('tasks', withUser({ ...task, completed_at }, user)))
      },
      deleteTask(id) {
        return mutate(() => dataService.remove('tasks', id))
      },
      saveNote(note) {
        if (!note.title?.trim() && !note.body?.trim()) throw new Error('Add a title or note text before saving.')
        return mutate(() => dataService.upsert('notes', withUser(note, user)))
      },
      deleteNote(id) {
        return mutate(() => dataService.remove('notes', id))
      },
      saveCategory(category) {
        if (!category.name?.trim()) throw new Error('Category name is required.')
        return mutate(() => dataService.upsert('categories', withUser(category, user)))
      },
      deleteCategory(id) {
        return mutate(() => dataService.remove('categories', id))
      },
      async uploadNoteAttachment(file, noteId, caption = '') {
        const errorMessage = validateImage(file)
        if (errorMessage) throw new Error(errorMessage)
        return mutate(() => dataService.uploadImage(file, 'notes', { note_id: noteId, caption }))
      },
      async uploadMoment(file, caption = '', category_id = null) {
        const errorMessage = validateImage(file)
        if (errorMessage) throw new Error(errorMessage)
        return mutate(() => dataService.uploadImage(file, 'moments', { caption, category_id }))
      },
      deleteMoment(id) {
        return mutate(() => dataService.remove('moments', id))
      },
      savePreferences(preferences) {
        return mutate(() => dataService.savePreferences(withUser(preferences, user)))
      },
      saveProfile(profile) {
        return mutate(() => dataService.saveProfile(withUser(profile, user)))
      },
    }),
    [error, loading, mutate, refresh, state, user],
  )

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>
}

export const useCozyData = () => useContext(DataContext)
