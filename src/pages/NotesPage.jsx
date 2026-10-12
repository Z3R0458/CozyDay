import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pin, Search, Trash2, Upload } from 'lucide-react'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import { Field, inputClass } from '../components/common/Field'
import StatusMessage from '../components/common/StatusMessage'
import { useCozyData } from '../hooks/useCozyData'
import { formatDateTime, timeRemaining } from '../utils/dates'

const emptyNote = { title: '', body: '', category_id: '', tags: [], pinned: false, task_id: '' }

export default function NotesPage() {
  const data = useCozyData()
  const [searchParams] = useSearchParams()
  const selectedNoteId = searchParams.get('note')
  const [draft, setDraft] = useState(emptyNote)
  const [query, setQuery] = useState('')
  const [tagText, setTagText] = useState('')
  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [status, setStatus] = useState('')

  const notes = useMemo(
    () =>
      (data.notes || [])
        .filter((note) => `${note.title} ${note.body} ${(note.tags || []).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updated_at || 0) - new Date(a.updated_at || 0)),
    [data.notes, query],
  )

  useEffect(() => {
    if (!selectedNoteId) return
    setQuery('')
    window.requestAnimationFrame(() => document.getElementById(`note-${selectedNoteId}`)?.scrollIntoView({ block: 'center' }))
  }, [selectedNoteId])

  const save = async (event) => {
    event.preventDefault()
    setStatus('Saving...')
    try {
      const saved = await data.saveNote(draft)
      if (file) await data.uploadNoteAttachment(file, saved.id || draft.id, caption)
      setDraft(emptyNote)
      setFile(null)
      setCaption('')
      setStatus('Saved')
    } catch (err) {
      setStatus(err.message || 'Save failed')
    }
  }

  const addTag = () => {
    if (!tagText.trim()) return
    setDraft({ ...draft, tags: [...new Set([...(draft.tags || []), tagText.trim()])] })
    setTagText('')
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[26rem_1fr]">
      <Card as="form" onSubmit={save} className="h-max">
        <h1 className="mb-4 text-2xl font-black">{draft.id ? 'Edit note' : 'New note'}</h1>
        <div className="grid gap-4">
          <StatusMessage type={status === 'Saved' ? 'success' : status.includes('fail') || status.includes('required') ? 'error' : 'info'}>{status}</StatusMessage>
          <Field label="Title"><input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="Text"><textarea className={`${inputClass} min-h-44`} value={draft.body || ''} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
          <Field label="Project"><select className={inputClass} value={draft.category_id || ''} onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}><option value="">None</option>{(data.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
          <Field label="Related task"><select className={inputClass} value={draft.task_id || ''} onChange={(e) => setDraft({ ...draft, task_id: e.target.value || null })}><option value="">None</option>{(data.tasks || []).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field>
          <Field label="Tags"><div className="flex gap-2"><input className={inputClass} value={tagText} onChange={(e) => setTagText(e.target.value)} /><Button variant="secondary" onClick={addTag}>Add</Button></div></Field>
          {!!draft.tags?.length && <div className="flex flex-wrap gap-2">{draft.tags.map((tag) => <span key={tag} className="rounded-full bg-lavender px-3 py-1 text-xs font-black">{tag}</span>)}</div>}
          <label className="flex min-h-11 items-center gap-2 font-extrabold"><input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} /> Pin note</label>
          <Field label="Optional image attachment" hint="Your photos are private and automatically deleted after 7 days. Written notes and captions will remain available."><input className={inputClass} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
          {file && <img className="max-h-48 rounded-2xl object-cover" src={URL.createObjectURL(file)} alt="Attachment preview" />}
          <Field label="Attachment caption"><input className={inputClass} value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
          <Button type="submit"><Upload size={18} /> Save note</Button>
        </div>
      </Card>
      <section className="grid gap-4">
        <div>
          <h1 className="text-3xl font-black">Notes</h1>
          <p className="text-sm font-bold text-slate">A notebook for schoolwork, project ideas, and thoughts. Text remains even when images expire.</p>
        </div>
        <label className="relative"><Search className="absolute left-3 top-3 text-slate" size={18} /><input className={`${inputClass} pl-10`} placeholder="Search notes" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        {notes.length ? notes.map((note) => (
          <Card key={note.id} id={`note-${note.id}`} className={note.id === selectedNoteId ? 'ring-4 ring-sky/50' : ''}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0"><h2 className="break-words text-xl font-black">{note.pinned && <Pin className="mr-1 inline" size={18} />} {note.title || 'Untitled note'}</h2><p className="text-xs font-bold text-slate">Updated {formatDateTime(note.updated_at)}</p></div>
              <div className="grid grid-cols-2 gap-2 sm:flex"><Button variant="secondary" onClick={() => setDraft(note)}>Edit</Button><Button variant="danger" onClick={() => window.confirm('Delete this note?') && data.deleteNote(note.id)}><Trash2 size={18} /></Button></div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6">{note.body}</p>
            {!!note.tags?.length && <div className="mt-3 flex flex-wrap gap-2">{note.tags.map((tag) => <span key={tag} className="rounded-full bg-lavender px-3 py-1 text-xs font-black">{tag}</span>)}</div>}
            {!!note.attachments?.length && <div className="mt-4 grid gap-3 sm:grid-cols-2">{note.attachments.map((image) => <figure key={image.id} className="rounded-2xl bg-cloud p-2">{image.deleted_at || !image.signed_url ? <div className="grid aspect-video place-items-center rounded-xl bg-border font-black">Image expired</div> : <img src={image.signed_url} alt={image.caption || 'Note attachment'} className="aspect-video w-full rounded-xl object-cover" />}<figcaption className="mt-2 text-xs font-bold text-slate">{image.caption} {timeRemaining(image.expires_at)}</figcaption></figure>)}</div>}
          </Card>
        )) : <EmptyState title="No notes yet">Save a note with or without images whenever you need a quiet place to think.</EmptyState>}
      </section>
    </div>
  )
}
