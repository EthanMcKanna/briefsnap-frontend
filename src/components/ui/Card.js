import React from 'react'

export const Card = ({ children, className }) => {
  return (
    <div className={`bg-white shadow-md rounded-lg overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className }) => {
  return (
    <div className={`p-4 border-b ${className}`}>
      {children}
    </div>
  )
}

export const CardContent = ({ children, className }) => {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  )
}

export const CardFooter = ({ children, className }) => {
  return (
    <div className={`p-4 border-t ${className}`}>
      {children}
    </div>
  )
}

export const CardTitle = ({ children, className }) => {
  return (
    <h2 className={`text-xl font-bold ${className}`}>
      {children}
    </h2>
  )
}

export const CardDescription = ({ children, className }) => {
  return (
    <p className={`text-sm text-gray-500 ${className}`}>
      {children}
    </p>
  )
}
