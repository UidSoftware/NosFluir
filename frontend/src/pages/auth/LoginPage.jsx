import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input, FormField } from '@/components/ui/primitives'
import { Toaster } from '@/components/ui/toast'
import { toast } from '@/hooks/useToast'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const { login, isLoading } = useAuthStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast({ title: 'Preencha e-mail e senha.', variant: 'destructive' })
      return
    }
    const result = await login(email, password)
    if (result.success) {
      navigate(from, { replace: true })
    } else {
      toast({ title: 'Acesso negado', description: result.error, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-fluir-dark relative overflow-hidden">
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-fluir-purple/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-fluir-cyan/5 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(93,92,224,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(93,92,224,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Card de login */}
      <div className="relative w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-fluir flex items-center justify-center mx-auto mb-4 shadow-lg shadow-fluir-purple/30 animate-glow-pulse">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Studio Fluir</h1>
          <p className="text-xs text-muted-foreground mt-1">Sistema de Gestão</p>
        </div>

        {/* Formulário */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl card-glow">
          <h2 className="text-sm font-semibold mb-5">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="E-mail" required>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={isLoading}
              />
            </FormField>

            <FormField label="Senha" required>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            <Button type="submit" variant="gradient" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Entrar
                </span>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          Uid Software © {new Date().getFullYear()} — Nos Studio Fluir
        </p>
      </div>

      <Toaster />
    </div>
  )
}
