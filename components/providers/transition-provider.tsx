"use client"

import { TransitionRouter } from 'next-transition-router'

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  return (
    <TransitionRouter
      auto={true}
      leave={(next, from, to) => {
        // Optional custom leave animation
        next()
      }}
      enter={(next) => {
        // Optional custom enter animation
        next()
      }}
    >
      {children}
    </TransitionRouter>
  )
}
