import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Car } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login, parseError } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    try {
      setError(null)
      await login(data)
    } catch (err) {
      setError(parseError(err))
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 rounded-xl gradient-teal logo-glow flex items-center justify-center mb-4">
            <Car size={26} className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">TruDrive Admin</h1>
          <p className="text-xs text-muted-foreground mt-1">Acesso restrito ao painel administrativo</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="email"
            label="E-mail"
            type="email"
            placeholder="admin@trudrive.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="password"
            label="Senha"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {error && (
            <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}
