import CloudPuppy from '../mascot/CloudPuppy'

export default function EmptyState({ title, children, action }) {
  return (
    <div className="grid place-items-center gap-4 rounded-[1.5rem] border border-dashed border-sky bg-cloud p-8 text-center">
      <CloudPuppy className="w-24" />
      <div>
        <h3 className="text-lg font-extrabold text-navy">{title}</h3>
        <p className="mt-1 max-w-md text-sm font-semibold text-slate">{children}</p>
      </div>
      {action}
    </div>
  )
}
