"use client"

import { useRef, useEffect } from 'react'
import { initLandingAnimations } from '@/lib/animations/landing.animations'

export function LandingAnimations({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const revert = initLandingAnimations(ref.current)
    return () => revert()
  }, [])

  return <div ref={ref}>{children}</div>
}
