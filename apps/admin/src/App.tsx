import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './presentation/providers/AppProviders'
import { router } from './presentation/router'

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
