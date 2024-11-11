import React from 'react'

export const ScrollArea = ({ children, className }) => {
  return (
    <div className={`overflow-y-auto max-h-full ${className}`}>
      {children}
    </div>
  )
}
