import * as React from 'react'
import { cn } from '../../lib/utils'

const Button = React.forwardRef(function Button(
  { className, variant = 'default', size = 'default', ...props },
  ref
) {
  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 disabled:pointer-events-none disabled:opacity-50'

  const variants = {
    default: 'bg-yellow-400 text-slate-900 hover:bg-yellow-300',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-yellow-400/70 bg-transparent text-yellow-500 hover:bg-yellow-400/10',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'hover:bg-gray-100 text-gray-900',
  }

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3',
    lg: 'h-11 px-8',
    icon: 'h-10 w-10',
  }

  return (
    <button
      ref={ref}
      className={cn(base, variants[variant] || variants.default, sizes[size] || sizes.default, className)}
      {...props}
    />
  )
})

export { Button }
