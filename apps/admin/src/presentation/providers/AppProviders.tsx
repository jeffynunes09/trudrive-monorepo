import type { ReactNode } from 'react'
import { DIProvider } from './DIProvider'
import { QueryProvider } from './QueryProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <DIProvider>
      <QueryProvider>{children}</QueryProvider>
    </DIProvider>
  )
}
