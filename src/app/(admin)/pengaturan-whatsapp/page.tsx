"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Smartphone,
  QrCode,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Save,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type WaStatus = {
  driver: string
  enabled: boolean
  configured: boolean
  base_url: string
  ok: boolean
  reason: string | null
  message: string | null
  status: string | null // "connected" | "disconnected" | ...
  connected: boolean
}

type WaSettings = { driver: string; enabled: boolean; base_url: string; token_set: boolean; secret_set: boolean }
type QrResp = { ok: boolean; scan_url?: string | null; message?: string | null }

export default function PengaturanWhatsAppPage() {
  const [status, setStatus] = useState<WaStatus | null>(null)
  const [scanUrl, setScanUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Editable config form
  const [form, setForm] = useState({ enabled: false, base_url: "", token: "", secret: "" })
  const [tokenSet, setTokenSet] = useState(false)
  const [secretSet, setSecretSet] = useState(false)
  const [saving, setSaving] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get<WaStatus>("/api/whatsapp/status")
      setStatus(res)
      return res
    } catch {
      setStatus(null)
      return null
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const s = await api.get<WaSettings>("/api/whatsapp/settings")
      setForm({ enabled: s.enabled, base_url: s.base_url ?? "", token: "", secret: "" })
      setTokenSet(s.token_set)
      setSecretSet(s.secret_set)
    } catch {
      /* keep defaults */
    }
  }, [])

  const loadQr = useCallback(async () => {
    try {
      const res = await api.get<QrResp>("/api/whatsapp/qr")
      setScanUrl(res.ok ? res.scan_url ?? null : null)
    } catch {
      setScanUrl(null)
    }
  }, [])

  useEffect(() => {
    Promise.all([loadStatus(), loadSettings(), loadQr()]).finally(() => setLoading(false))
  }, [loadStatus, loadSettings, loadQr])

  // Poll status while enabled+configured and not yet connected.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!status?.enabled || !status?.configured || status?.connected) return
    pollRef.current = setInterval(() => loadStatus(), 6000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [status?.enabled, status?.configured, status?.connected, loadStatus])

  async function saveSettings() {
    if (form.enabled && !form.base_url.trim()) {
      toast.error("Server Wablas (base URL) wajib diisi.")
      return
    }
    setSaving(true)
    try {
      await api.put("/api/whatsapp/settings", {
        enabled: form.enabled,
        base_url: form.base_url.trim() || null,
        token: form.token.trim() || null, // blank = keep existing
        secret: form.secret.trim() || null, // blank = keep existing
      })
      toast.success("Pengaturan disimpan")
      setForm((f) => ({ ...f, token: "", secret: "" }))
      await Promise.all([loadStatus(), loadSettings(), loadQr()])
    } catch (err) {
      const e = err as { message?: string }
      toast.error(e?.message || "Gagal menyimpan pengaturan")
    } finally {
      setSaving(false)
    }
  }

  const s = status
  const statusBadge = !s?.enabled
    ? { label: "Nonaktif", className: "bg-gray-100 text-gray-600 border-gray-200" }
    : !s?.configured
      ? { label: "Belum dikonfigurasi", className: "bg-amber-100 text-amber-700 border-amber-200" }
      : s?.connected
        ? { label: "Terhubung", className: "bg-green-100 text-green-700 border-green-200" }
        : { label: "Belum terhubung", className: "bg-amber-100 text-amber-700 border-amber-200" }

  return (
    <div className="container py-6 space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-7 w-7" />
            Koneksi WhatsApp
          </h1>
          <p className="text-muted-foreground">Hubungkan nomor WhatsApp untuk notifikasi &amp; broadcast (via Wablas).</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadStatus()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && !s ? (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ---- Connection status / QR ---- */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Status Koneksi</CardTitle>
                <CardDescription>{s?.base_url || form.base_url || "Wablas"}</CardDescription>
              </div>
              <Badge variant="outline" className={statusBadge.className}>
                {s?.connected && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                {statusBadge.label}
              </Badge>
            </CardHeader>
            <CardContent>
              {!s?.enabled ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  WhatsApp dinonaktifkan. Aktifkan lewat form <b>Konfigurasi</b> di bawah lalu simpan.
                </div>
              ) : !s?.configured ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  Belum dikonfigurasi. Isi Server Wablas, Token &amp; Secret pada form di bawah.
                </div>
              ) : s?.connected ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">WhatsApp terhubung</p>
                    <p className="text-sm text-muted-foreground">
                      Device Wablas aktif. Kelola/putuskan koneksi dari dashboard Wablas.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <QrCode className="h-4 w-4" /> Scan QR untuk menghubungkan
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Buka WhatsApp di HP → <b>Perangkat Tertaut</b> → <b>Tautkan Perangkat</b>, lalu scan QR di bawah.
                    Klik <b>Generate Qr Code</b> bila QR belum muncul.
                  </p>
                  {scanUrl ? (
                    <div className="space-y-2">
                      <div className="overflow-hidden rounded-lg border bg-white">
                        <iframe
                          src={scanUrl}
                          title="Scan QR WhatsApp (Wablas)"
                          className="w-full h-[540px]"
                        />
                      </div>
                      <a
                        href={scanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Buka halaman scan di tab baru
                      </a>
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg border">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---- Editable configuration ---- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Konfigurasi Wablas</CardTitle>
              <CardDescription>Tersimpan di database — bisa diubah tanpa menyentuh file .env server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  id="wa-enabled"
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v === true }))}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <Label htmlFor="wa-enabled" className="cursor-pointer">Aktifkan WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">Saat aktif, sistem mengirim notifikasi &amp; broadcast WhatsApp ke pelanggan.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-base">Server Wablas (Base URL)</Label>
                <Input
                  id="wa-base"
                  placeholder="https://bdg.wablas.com"
                  value={form.base_url}
                  onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-token">Token</Label>
                <Input
                  id="wa-token"
                  type="password"
                  autoComplete="new-password"
                  placeholder={tokenSet ? "•••••••• (biarkan kosong untuk tetap)" : "Masukkan token Wablas"}
                  value={form.token}
                  onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {tokenSet ? "Token sudah tersimpan. Isi hanya bila ingin menggantinya." : "Belum ada token tersimpan."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-secret">Secret Key</Label>
                <Input
                  id="wa-secret"
                  type="password"
                  autoComplete="new-password"
                  placeholder={secretSet ? "•••••••• (biarkan kosong untuk tetap)" : "Masukkan secret key Wablas"}
                  value={form.secret}
                  onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {secretSet ? "Secret sudah tersimpan. Isi hanya bila ingin menggantinya." : "Diperlukan untuk mode secure Wablas (Authorization: token.secret)."}
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Pengaturan
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
