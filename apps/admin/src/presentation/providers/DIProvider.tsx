import { createContext, useContext, type ReactNode } from 'react'
import { createContainer, type DIContainer } from '../../infrastructure/di/container'

const DIContext = createContext<DIContainer | null>(null)

// Container singleton — instanciado uma única vez fora da árvore React
const container = createContainer()

export function DIProvider({ children }: { children: ReactNode }) {
  return <DIContext.Provider value={container}>{children}</DIContext.Provider>
}

export function useContainer(): DIContainer {
  const ctx = useContext(DIContext)
  if (!ctx) throw new Error('useContainer deve ser usado dentro de DIProvider')
  return ctx
}
