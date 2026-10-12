import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Camera, RotateCcw, Trash2, Upload, Video, X } from 'lucide-react'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import { Field, inputClass } from '../components/common/Field'
import StatusMessage from '../components/common/StatusMessage'
import { useCozyData } from '../hooks/useCozyData'
import { formatDateTime, timeRemaining } from '../utils/dates'

export default function MomentsPage() {
  const data = useCozyData()
  const [searchParams] = useSearchParams()
  const selectedMomentId = searchParams.get('moment')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [viewer, setViewer] = useState(null)
  const [stream, setStream] = useState(null)
  const [cameraError, setCameraError] = useState('')

  const moments = useMemo(() => [...(data.moments || [])].sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0)), [data.moments])

  useEffect(() => {
    if (!selectedMomentId) return
    window.requestAnimationFrame(() => document.getElementById(`moment-${selectedMomentId}`)?.scrollIntoView({ block: 'center' }))
  }, [selectedMomentId])

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream])

  const startCamera = async () => {
    setCameraError('')
    setStatus('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not support direct camera capture. Use Choose photo instead.')
      return
    }
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      setStream(nextStream)
    } catch (err) {
      setCameraError(err.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'Could not start the camera.')
    }
  }

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop())
    setStream(null)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError('Could not capture the photo. Please try again.')
          return
        }
        setFile(new File([blob], `cozyday-camera-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        stopCamera()
      },
      'image/jpeg',
      0.92,
    )
  }

  const upload = async (event) => {
    event.preventDefault()
    setStatus('Uploading...')
    try {
      await data.uploadMoment(file, caption, categoryId || null)
      setFile(null)
      setCaption('')
      setCategoryId('')
      setStatus('Moment saved.')
    } catch (err) {
      setStatus(err.message || 'Upload failed.')
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-black">Moments</h1>
        <p className="text-sm font-bold text-slate">A private photo diary for selfies, study sessions, meals, and progress snapshots.</p>
      </div>
      <Card as="form" onSubmit={upload} className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-4">
          <StatusMessage type={status.includes('saved') ? 'success' : status.includes('failed') || status.includes('Choose') ? 'error' : 'info'}>{status}</StatusMessage>
          <p className="rounded-2xl bg-butter/70 p-3 text-sm font-extrabold text-navy">
            Your photos are private and automatically deleted after 7 days. Written notes and captions will remain available.
          </p>
          <Field label="Choose photo" hint="Supports JPEG, PNG, and WebP. On many phones this can also open the native camera.">
            <input className={inputClass} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Field>
          <div className="grid gap-3 rounded-[1.5rem] border border-border bg-cloud p-3">
            <div className="flex flex-wrap gap-2">
              {!stream ? (
                <Button variant="secondary" onClick={startCamera}>
                  <Video size={18} /> Take photo
                </Button>
              ) : (
                <>
                  <Button variant="primary" onClick={capturePhoto}>
                    <Camera size={18} /> Capture
                  </Button>
                  <Button variant="secondary" onClick={stopCamera}>
                    <X size={18} /> Close camera
                  </Button>
                </>
              )}
              {file && (
                <Button variant="soft" onClick={() => setFile(null)}>
                  <RotateCcw size={18} /> Retake
                </Button>
              )}
            </div>
            {cameraError && <StatusMessage type="error">{cameraError}</StatusMessage>}
            <p className="text-xs font-bold text-slate">
              Direct camera capture works on supported browsers over localhost or HTTPS after permission is granted.
            </p>
          </div>
          <Field label="Optional caption"><input className={inputClass} value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
          <Field label="Optional project"><select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">None</option>{(data.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
          <Button type="submit"><Upload size={18} /> Upload moment</Button>
        </div>
        <div className="grid min-h-64 place-items-center rounded-[1.5rem] bg-mist p-3">
          {stream ? (
            <video ref={videoRef} autoPlay playsInline muted className="max-h-96 w-full rounded-2xl object-contain" />
          ) : previewUrl ? (
            <img src={previewUrl} alt="Moment preview" className="max-h-80 rounded-2xl object-contain" />
          ) : (
            <Camera className="text-sky" size={72} />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </Card>
      {moments.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {moments.map((moment) => (
            <Card key={moment.id} id={`moment-${moment.id}`} as="article" className={`p-3 ${moment.id === selectedMomentId ? 'ring-4 ring-sky/50' : ''}`}>
              {moment.deleted_at || !moment.signed_url ? (
                <div className="grid aspect-square place-items-center rounded-[1.25rem] bg-border text-center font-black">Image expired</div>
              ) : (
                <button className="block w-full" onClick={() => setViewer(moment)} aria-label="Open image viewer">
                  <img src={moment.signed_url} alt={moment.caption || 'Private moment'} className="aspect-square w-full rounded-[1.25rem] object-cover" />
                </button>
              )}
              <div className="grid gap-2 p-2">
                <p className="font-extrabold">{moment.caption || 'Photo-only moment'}</p>
                <p className="text-xs font-bold text-slate">Uploaded {formatDateTime(moment.uploaded_at)} · {timeRemaining(moment.expires_at)}</p>
                <Button variant="danger" onClick={() => window.confirm('Delete this moment?') && data.deleteMoment(moment.id)}><Trash2 size={18} /> Delete</Button>
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <EmptyState title="No moments yet">Upload a photo without needing to write a caption.</EmptyState>
      )}
      {viewer && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-deep/75 p-4" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
          <figure className="max-h-[90vh] max-w-4xl rounded-[1.5rem] bg-white p-3" onClick={(event) => event.stopPropagation()}>
            <img src={viewer.signed_url} alt={viewer.caption || 'Private moment'} className="max-h-[72vh] rounded-2xl object-contain" />
            <figcaption className="mt-2 font-bold text-navy">{viewer.caption || 'Photo-only moment'} · {timeRemaining(viewer.expires_at)}</figcaption>
          </figure>
        </div>
      )}
    </div>
  )
}
