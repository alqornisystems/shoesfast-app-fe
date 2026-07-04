"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Smartphone,
  QrCode,
  RefreshCw,
  LogOut,
  Power,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Save,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type WaMe = { id?: string; pushName?: string } | null

type WaStatus = {
  enabled: boolean
  configured: boolean
  base_url: string
  session: string
  ok: boolean
  reason: string | null
  message: string | null
  status: string | null // WORKING | SCAN_QR_CODE | STARTING | STOPPED | FAILED
  connected: boolean
  needs_scan: boolean
  me: WaMe
}

type WaSettings = { enabled: boolean; base_url: string; session: string; api_key_set: boolean }
type QrResp = { ok: boolean; qr?: string | null }

const STATUS_META: Record<string, { label: string; className: string }> = {
  WORKING: { label: "Terhubung", className: "bg-green-100 text-green-700 border-green-200" },
  SCAN_QR_CODE: { label: "Menunggu Scan", className: "bg-amber-100 text-amber-700 border-amber-200" },
  STARTING: { label: "Memulai...", className: "bg-blue-100 text-blue-700 border-blue-200" },
  STOPPED: { label: "Berhenti", className: "bg-gray-100 text-gray-600 border-gray-200" },
  FAILED: { label: "Gagal", className: "bg-red-100 text-red-700 border-red-200" },
}

function phoneFromId(id?: string): string {
  if (!id) return "-"
  return "+" + id.replace(/@c\.us$/, "").replace(/@s\.whatsapp\.net$/, "")
}

export default function PengaturanWhatsAppPage() {
  const [status, setStatus] = useState<WaStatus | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  // Editable config form
  const [form, setForm] = useState({ enabled: false, base_url: "", session: "", api_key: "" })
  const [apiKeySet, setApiKeySet] = useState(false)
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
      setForm({ enabled: s.enabled, base_url: s.base_url ?? "", session: s.session ?? "", api_key: "" })
      setApiKeySet(s.api_key_set)
    } catch {
      /* keep defaults */
    }
  }, [])

  const loadQr = useCallback(async () => {
    try {
      const res = await api.get<QrResp>("/api/whatsapp/qr")
      setQr(res.ok ? res.qr ?? null : null)
    } catch {
      setQr(null)
    }
  }, [])

  useEffect(() => {
    Promise.all([loadStatus(), loadSettings()]).finally(() => setLoading(false))
  }, [loadStatus, loadSettings])

  // Poll while enabled+configured and not yet connected; fetch QR when scanning.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!status?.enabled || !status?.configured || status?.connected) {
      if (status?.connected) setQr(null)
      return
    }
    if (status.needs_scan) loadQr()
    pollRef.current = setInterval(async () => {
      const fresh = await loadStatus()
      if (fresh?.needs_scan) loadQr()
    }, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [status?.enabled, status?.configured, status?.connected, status?.needs_scan, loadStatus, loadQr])

  async function runAction(action: "start" | "restart" | "logout", label: string) {
    setActing(action)
    try {
      const res = await api.post<{ ok: boolean; message?: string }>(`/api/whatsapp/${action}`)
      if (res.ok) toast.success(`${label} berhasil`)
      else toast.error(res.message || `${label} gagal`)
      if (action === "logout") setQr(null)
      await loadStatus()
    } catch {
      toast.error(`${label} gagal`)
    } finally {
      setActing(null)
    }
  }

  async function saveSettings() {
    if (form.enabled && !form.base_url.trim()) {
      toast.error("Server WAHA (base URL) wajib diisi.")
      return
    }
    setSaving(true)
    try {
      await api.put("/api/whatsapp/settings", {
        enabled: form.enabled,
        base_url: form.base_url.trim() || null,
        session: form.session.trim() || null,
        api_key: form.api_key.trim() || null, // blank = keep existing
      })
      toast.success("Pengaturan disimpan")
      setForm((f) => ({ ...f, api_key: "" }))
      await Promise.all([loadStatus(), loadSettings()])
    } catch (err) {
      const e = err as { message?: string }
      toast.error(e?.message || "Gagal menyimpan pengaturan")
    } finally {
      setSaving(false)
    }
  }

  const s = status
  const statusMeta = s?.status
    ? STATUS_META[s.status] ?? { label: s.status, className: "bg-gray-100 text-gray-600 border-gray-200" }
    : null

  return (
    <div className="container py-6 space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-7 w-7" />
            Koneksi WhatsApp
          </h1>
          <p className="text-muted-foreground">Hubungkan nomor WhatsApp untuk notifikasi &amp; broadcast (via WAHA).</p>
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
                <CardDescription>Sesi: {s?.session || form.session || "-"}</CardDescription>
              </div>
              {s?.enabled && s?.configured && statusMeta && (
                <Badge variant="outline" className={statusMeta.className}>
                  {s?.connected && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                  {statusMeta.label}
                </Badge>
              )}
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
                  Belum dikonfigurasi. Isi Server WAHA &amp; API Key pada form di bawah.
                </div>
              ) : !s?.ok && s?.reason === "unreachable" ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  {s?.message ?? "Tidak dapat terhubung ke server WAHA."}
                </div>
              ) : s?.connected ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{s?.me?.pushName || "WhatsApp terhubung"}</p>
                      <p className="text-sm text-muted-foreground">{phoneFromId(s?.me?.id)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => runAction("restart", "Restart sesi")} disabled={acting !== null}>
                      {acting === "restart" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Restart
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => runAction("logout", "Putuskan koneksi")} disabled={acting !== null}>
                      {acting === "logout" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                      Putuskan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4">
                  {s?.needs_scan ? (
                    <>
                      <div className="rounded-xl border bg-white p-3">
                        {qr ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={qr} alt="QR WhatsApp" className="h-56 w-56" />
                        ) : (
                          <div className="h-56 w-56 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="text-center text-sm text-muted-foreground max-w-sm">
                        <p className="font-medium text-foreground mb-1 flex items-center justify-center gap-1.5">
                          <QrCode className="h-4 w-4" /> Scan untuk menghubungkan
                        </p>
                        Buka WhatsApp di HP → <b>Perangkat Tertaut</b> → <b>Tautkan Perangkat</b>, lalu arahkan kamera ke QR ini.
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => loadQr()}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Perbarui QR
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                        <Power className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">Sesi belum aktif. Mulai sesi untuk menampilkan QR code.</p>
                      <Button onClick={() => runAction("start", "Mulai sesi")} disabled={acting !== null}>
                        {acting === "start" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Power className="h-4 w-4 mr-2" />}
                        Mulai Sesi
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---- Editable configuration ---- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Konfigurasi WAHA</CardTitle>
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
                <Label htmlFor="wa-base">Server WAHA (Base URL)</Label>
                <Input
                  id="wa-base"
                  placeholder="https://wapi.contoh.id"
                  value={form.base_url}
                  onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-session">Nama Sesi</Label>
                <Input
                  id="wa-session"
                  placeholder="default"
                  value={form.session}
                  onChange={(e) => setForm((f) => ({ ...f, session: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-key">API Key</Label>
                <Input
                  id="wa-key"
                  type="password"
                  autoComplete="new-password"
                  placeholder={apiKeySet ? "•••••••• (biarkan kosong untuk tetap)" : "Masukkan API key WAHA"}
                  value={form.api_key}
                  onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {apiKeySet ? "API key sudah tersimpan. Isi hanya bila ingin menggantinya." : "Belum ada API key tersimpan."}
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
