const variants = {
  primary: 'bg-navy text-white hover:bg-deep',
  secondary: 'bg-white text-navy border border-border hover:bg-mist',
  soft: 'bg-mist text-navy hover:bg-baby',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-navy hover:bg-mist',
}

export default function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
