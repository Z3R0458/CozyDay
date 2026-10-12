export default function StatusMessage({ type = 'info', children }) {
  if (!children) return null
  const styles = {
    info: 'border-sky bg-mist text-navy',
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
  return <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${styles[type]}`}>{children}</div>
}
