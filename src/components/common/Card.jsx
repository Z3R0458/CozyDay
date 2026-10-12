import { createElement } from 'react'

export default function Card({ children, className = '', as: Component = 'section', ...props }) {
  return createElement(Component, {
    className: `rounded-[1.25rem] border border-border bg-white/90 p-4 shadow-cozy sm:rounded-[1.5rem] sm:p-5 ${className}`,
    ...props,
    children,
  })
}
