import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const adminToken = Deno.env.get('CLEANUP_ADMIN_TOKEN')
const bucket = Deno.env.get('IMAGE_BUCKET') || 'cozyday-private-images'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

async function cleanupTable(table: 'moments' | 'image_attachments') {
  const { data: rows, error } = await supabase
    .from(table)
    .select('id, storage_path, cleanup_attempts')
    .lte('expires_at', new Date().toISOString())
    .is('deleted_at', null)
    .order('expires_at', { ascending: true })
    .limit(100)

  if (error) throw error
  const results = []

  for (const row of rows || []) {
    const { error: removeError } = await supabase.storage.from(bucket).remove([row.storage_path])
    if (removeError && !removeError.message.toLowerCase().includes('not found')) {
      await supabase
        .from(table)
        .update({
          cleanup_attempts: (row.cleanup_attempts || 0) + 1,
          cleanup_error: removeError.message.slice(0, 500),
        })
        .eq('id', row.id)
      results.push({ id: row.id, ok: false })
      continue
    }

    await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString(), cleanup_error: null })
      .eq('id', row.id)
    results.push({ id: row.id, ok: true })
  }

  return results
}

Deno.serve(async (request) => {
  if (adminToken && request.headers.get('x-cleanup-token') !== adminToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const [moments, attachments] = await Promise.all([cleanupTable('moments'), cleanupTable('image_attachments')])
    return new Response(JSON.stringify({ moments, attachments }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
})
