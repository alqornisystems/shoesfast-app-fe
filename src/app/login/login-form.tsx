"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// Normalize phone number: remove leading 0 or 62
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '') // Remove non-digits
  if (normalized.startsWith('62')) {
    normalized = normalized.substring(2) // Remove 62
  } else if (normalized.startsWith('0')) {
    normalized = normalized.substring(1) // Remove 0
  }
  return normalized
}

export function LoginForm() {
  const { login } = useAuth()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone || !password) {
      setError("Nomor telepon dan PIN wajib diisi.")
      return
    }
    setError("")
    setLoading(true)
    try {
      const normalizedPhone = normalizePhone(phone)
      await login(normalizedPhone, password, rememberMe)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e?.message ?? "Terjadi kesalahan. Coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error alert */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Nomor Telepon</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="08123456789"
          autoComplete="tel"
          value={phone}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '')
            setPhone(value)
            setError("")
          }}
          className={cn(error && "border-destructive")}
          disabled={loading}
        />
      </div>

      {/* PIN */}
      <div className="space-y-1.5">
        <Label htmlFor="password">PIN</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPass ? "text" : "password"}
            placeholder="••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError("") }}
            className={cn("pr-10", error && "border-destructive")}
            disabled={loading}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Remember Me */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="remember"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(checked === true)}
          disabled={loading}
        />
        <Label
          htmlFor="remember"
          className="text-sm font-normal cursor-pointer"
        >
          Ingat saya selama 3 hari
        </Label>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full gap-2"
        disabled={loading}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  )
}
