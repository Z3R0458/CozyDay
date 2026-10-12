export function Field({ label, children, error, hint }) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-navy">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-semibold text-slate">{hint}</span>}
      {error && <span className="text-xs font-extrabold text-red-600">{error}</span>}
    </label>
  )
}

export const inputClass =
  'min-h-11 w-full rounded-2xl border border-border bg-white px-3 py-2 text-navy shadow-sm transition placeholder:text-slate/70 focus:border-sky'
