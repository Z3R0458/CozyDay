import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import { Field, inputClass } from '../components/common/Field'
import StatusMessage from '../components/common/StatusMessage'
import { useCozyData } from '../hooks/useCozyData'

export default function CategoriesPage() {
  const data = useCozyData()
  const [draft, setDraft] = useState({ name: '', color: '#E7F5FF' })
  const [message, setMessage] = useState('')

  const save = async (event) => {
    event.preventDefault()
    try {
      await data.saveCategory(draft)
      setDraft({ name: '', color: '#E7F5FF' })
      setMessage('Project saved.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
      <Card as="form" onSubmit={save} className="h-max">
        <h1 className="mb-4 text-2xl font-black">{draft.id ? 'Rename project' : 'New project'}</h1>
        <div className="grid gap-4">
          <StatusMessage type={message.includes('saved') ? 'success' : 'error'}>{message}</StatusMessage>
          <Field label="Name"><input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="Color"><input className={`${inputClass} h-14`} type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></Field>
          <Button type="submit">Save project</Button>
        </div>
      </Card>
      <section className="grid gap-4">
        <div>
          <h1 className="text-3xl font-black">Categories and Projects</h1>
          <p className="text-sm font-bold text-slate">Organize tasks, notes, and moments with color labels.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(data.categories || []).map((category) => (
            <Card key={category.id}>
              <div className="mb-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
              <h2 className="text-xl font-black">{category.name}</h2>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => setDraft(category)}>Edit</Button>
                <Button variant="danger" onClick={() => window.confirm('Delete this project?') && data.deleteCategory(category.id)}><Trash2 size={18} /></Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
