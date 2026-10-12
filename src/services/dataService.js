import { IMAGE_BUCKET, IMAGE_RETENTION_DAYS, isSupabaseConfigured, supabase } from '../lib/supabase'
import { createId, fileToDataUrl, readLocalState, writeLocalState } from './storageService'
import { expiryFromNow } from '../utils/dates'

const now = () => new Date().toISOString()

const normalizeRow = (row) => ({
  ...row,
  checklist: row.checklist || [],
  tags: row.tags || [],
  attachments: row.attachments || [],
})

const pick = (item, fields) =>
  fields.reduce((payload, field) => {
    if (item[field] !== undefined) payload[field] = item[field]
    return payload
  }, {})

const tableFields = {
  tasks: [
    'id',
    'user_id',
    'category_id',
    'title',
    'description',
    'priority',
    'status',
    'start_at',
    'due_at',
    'reminder_at',
    'reminder_preset_minutes',
    'recurrence_rule',
    'checklist',
    'completed_at',
  ],
  notes: ['id', 'user_id', 'category_id', 'task_id', 'title', 'body', 'tags', 'pinned'],
  categories: ['id', 'user_id', 'name', 'color'],
  moments: ['id', 'user_id', 'category_id', 'storage_path', 'caption', 'uploaded_at', 'expires_at', 'deleted_at'],
  notification_preferences: ['user_id', 'enabled', 'browser_notifications', 'reminder_minutes'],
  profiles: ['user_id', 'display_name'],
}

const localApi = {
  async getAll() {
    return readLocalState()
  },
  async upsert(collection, item) {
    const state = readLocalState()
    const timestamp = now()
    const row = {
      ...item,
      id: item.id || createId(collection),
      created_at: item.created_at || timestamp,
      updated_at: timestamp,
    }
    state[collection] = [row, ...state[collection].filter((entry) => entry.id !== row.id)]
    writeLocalState(state)
    return row
  },
  async remove(collection, id) {
    const state = readLocalState()
    state[collection] = state[collection].filter((entry) => entry.id !== id)
    writeLocalState(state)
  },
  async uploadImage(file, folder, metadata = {}) {
    const state = readLocalState()
    const image = {
      id: createId('image'),
      storage_path: `${folder}/${createId('local-image')}-${file.name}`,
      signed_url: await fileToDataUrl(file),
      uploaded_at: now(),
      expires_at: expiryFromNow(IMAGE_RETENTION_DAYS),
      deleted_at: null,
      ...metadata,
    }
    if (folder === 'moments') {
      state.moments = [image, ...state.moments]
    } else {
      state.notes = state.notes.map((note) =>
        note.id === metadata.note_id ? { ...note, attachments: [image, ...(note.attachments || [])] } : note,
      )
    }
    writeLocalState(state)
    return image
  },
  async savePreferences(preferences) {
    const state = readLocalState()
    state.notificationPreferences = preferences
    writeLocalState(state)
    return preferences
  },
  async saveProfile(profile) {
    const state = readLocalState()
    state.profile = profile
    writeLocalState(state)
    return profile
  },
}

const supabaseApi = {
  async getAll() {
    const [
      { data: categories, error: categoriesError },
      { data: tasks, error: tasksError },
      { data: notes, error: notesError },
      { data: moments, error: momentsError },
      { data: taskReminders, error: taskRemindersError },
      { data: preferences, error: preferencesError },
      { data: profile, error: profileError },
    ] = await Promise.all([
      supabase.from('categories').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('notes').select('*, attachments:image_attachments(*)').order('updated_at', { ascending: false }),
      supabase.from('moments').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('task_reminders').select('*').order('scheduled_at', { ascending: true }),
      supabase.from('notification_preferences').select('*').maybeSingle(),
      supabase.from('profiles').select('*').maybeSingle(),
    ])
    const error = categoriesError || tasksError || notesError || momentsError || taskRemindersError || preferencesError || profileError
    if (error) throw error

    const withSignedUrls = await Promise.all(
      [...(moments || []), ...(notes || []).flatMap((note) => note.attachments || [])].map(async (image) => {
        if (image.deleted_at || !image.storage_path) return image
        const { data } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(image.storage_path, 3600)
        return { ...image, signed_url: data?.signedUrl || null }
      }),
    )
    const signedById = new Map(withSignedUrls.map((image) => [image.id, image]))

    return {
      categories: categories || [],
      tasks: (tasks || []).map(normalizeRow),
      notes: (notes || []).map((note) =>
        normalizeRow({
          ...note,
          attachments: (note.attachments || []).map((attachment) => signedById.get(attachment.id) || attachment),
        }),
      ),
      moments: (moments || []).map((moment) => signedById.get(moment.id) || moment),
      taskReminders: taskReminders || [],
      notificationPreferences: preferences || { enabled: false, browser_notifications: false, reminder_minutes: 30 },
      profile: profile || { display_name: '' },
    }
  },
  async upsert(collection, item) {
    const table = collection === 'moments' ? 'moments' : collection
    const payload = pick(item, tableFields[table] || Object.keys(item))
    const query = payload.id
      ? supabase.from(table).update(payload).eq('id', payload.id)
      : supabase.from(table).insert(payload)
    const { data, error } = await query.select().single()
    if (error) throw error
    return data
  },
  async remove(collection, id) {
    const { error } = await supabase.from(collection).delete().eq('id', id)
    if (error) throw error
  },
  async uploadImage(file, folder, metadata = {}) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('You must be signed in to upload images.')
    const storagePath = `${user.id}/${folder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) throw uploadError
    const row = {
      user_id: user.id,
      storage_path: storagePath,
      uploaded_at: now(),
      expires_at: expiryFromNow(IMAGE_RETENTION_DAYS),
      ...metadata,
    }
    const table = folder === 'moments' ? 'moments' : 'image_attachments'
    const { data, error } = await supabase.from(table).insert(row).select().single()
    if (error) throw error
    const { data: signed } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(storagePath, 3600)
    return { ...data, signed_url: signed?.signedUrl || null }
  },
  async savePreferences(preferences) {
    const payload = pick(preferences, tableFields.notification_preferences)
    const { data, error } = await supabase.from('notification_preferences').upsert(payload, { onConflict: 'user_id' }).select().single()
    if (error) throw error
    return data
  },
  async saveProfile(profile) {
    const payload = pick(profile, tableFields.profiles)
    const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' }).select().single()
    if (error) throw error
    return data
  },
}

export const dataService = isSupabaseConfigured ? supabaseApi : localApi
