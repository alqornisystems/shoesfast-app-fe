import { LoginForm } from "./login-form"
import { Shirt } from "lucide-react"

export const metadata = { title: "Login | Shoesfast" }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-md">
            <Shirt className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">Shoesfast</h1>
            <p className="text-sm text-muted-foreground">Management System</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border bg-card px-6 py-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Masuk ke akun Anda</h2>
            <p className="text-sm text-muted-foreground">
              Masukkan email dan password untuk melanjutkan.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
