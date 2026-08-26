"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SimplePagination } from "@/components/list-pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

type Claim = {
  id: number
  item_name: string | null
  order_id: number | null
  order_code: string | null
  customer_name: string | null
  note: string | null
  photo: string | null
  price: number | null
  status: number
  status_label: string
  date: number | null
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

const STORAGE_KEY_PAGE = "klaim_list_page"

export function ClaimClient() {
  const [rows, setRows] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("semua")
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
    from: 0,
    to: 0,
  })

  const [target, setTarget] = useState<Claim | null>(null)
  const [biaya, setBiaya] = useState("")
  const [catatan, setCatatan] = useState("")
  const [saving, setSaving] = useState(false)

  const initialized = useRef(false)

  const fetchRows = useCallback(async (page: number, statusFilter: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "25",
        ...(statusFilter !== "semua" ? { status: statusFilter } : {}),
      })
      const res = await api.get<{ data: Claim[] } & PaginationData>(
        `/api/guarantee-claims?${params}`
      )
      setRows(res.data)
      setPagination({
        current_page: res.current_page,
        last_page: res.last_page,
        per_page: res.per_page,
        total: res.total,
        from: res.from ?? 0,
        to: res.to ?? 0,
      })
      sessionStorage.setItem(STORAGE_KEY_PAGE, String(res.current_page))
    } catch {
      toast.error("Gagal memuat klaim garansi")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const savedPage = Number(sessionStorage.getItem(STORAGE_KEY_PAGE) ?? "1")
    fetchRows(savedPage, "semua").finally(() => {
      initialized.current = true
    })
  }, [fetchRows])

  useEffect(() => {
    if (!initialized.current) return
    fetchRows(1, status)
  }, [status, fetchRows])

  function openReview(c: Claim) {
    setTarget(c)
    setBiaya(c.price !== null ? String(c.price) : "")
    setCatatan(c.note ?? "")
  }

  async function putuskan(keputusan: 1 | 2) {
    if (!target) return
    setSaving(true)
    try {
      await api.put(`/api/guarantee-claims/${target.id}`, {
        status: keputusan,
        price: biaya === "" ? null : Number(biaya),
        note: catatan || null,
      })
      toast.success(keputusan === 1 ? "Klaim disetujui" : "Klaim ditolak")
      setTarget(null)
      fetchRows(pagination.current_page, status)
    } catch {
      toast.error("Gagal memperbarui klaim")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Klaim Garansi</h1>
        <p className="text-muted-foreground">
          Klaim dari portal pelanggan, maksimal 3 hari setelah barang diterima.
          Yang menunggu ditinjau tampil paling atas.
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua status</SelectItem>
              <SelectItem value="0">Menunggu ditinjau</SelectItem>
              <SelectItem value="1">Disetujui</SelectItem>
              <SelectItem value="2">Ditolak</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto">
            {pagination.total} klaim
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Barang</TableHead>
              <TableHead className="hidden sm:table-cell">Pelanggan</TableHead>
              <TableHead className="hidden md:table-cell">Pesanan</TableHead>
              <TableHead className="hidden lg:table-cell">Keluhan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Belum ada klaim garansi.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  {/* Null-safe di tiap kolom: barang, pesanan, dan pelanggan
                      semuanya bisa terhapus setelah klaim dibuat. */}
                  <TableCell className="font-medium">
                    {c.item_name ?? "-"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {c.customer_name ?? "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {c.order_id && c.order_code ? (
                      <Link
                        href={`/pesanan/${c.order_id}/edit`}
                        className="text-primary underline"
                      >
                        {c.order_code}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate lg:table-cell">
                    {c.note ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === 0
                          ? "secondary"
                          : c.status === 1
                            ? "outline"
                            : "destructive"
                      }
                    >
                      {c.status_label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {c.date ? formatDate(c.date) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={c.status === 0 ? "default" : "outline"}
                      onClick={() => openReview(c)}
                    >
                      {c.status === 0 ? "Tinjau" : "Lihat"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pagination.last_page > 1 && (
          <div className="flex items-center justify-between border-t p-3">
            <span className="text-sm text-muted-foreground">
              Menampilkan {pagination.from} - {pagination.to} dari{" "}
              {pagination.total}
            </span>
            <SimplePagination
              currentPage={pagination.current_page}
              totalPages={pagination.last_page}
              onPageChange={(halaman) => fetchRows(halaman , status)}
            />
          </div>
        )}
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klaim: {target?.item_name ?? "-"}</DialogTitle>
            <DialogDescription>
              Dari {target?.customer_name ?? "-"}, pesanan{" "}
              {target?.order_code ?? "-"}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-1 text-sm font-medium">Keluhan pelanggan</p>
              <p className="text-sm">{target?.note ?? "-"}</p>
            </div>

            {target?.photo && (
              <Image
                src={target.photo}
                alt="Foto klaim dari pelanggan"
                width={400}
                height={300}
                className="w-full rounded-lg object-cover"
                unoptimized
              />
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Biaya perbaikan (opsional)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Kosongkan bila gratis"
                value={biaya}
                onChange={(e) => setBiaya(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Catatan petugas</Label>
              <Textarea
                rows={3}
                placeholder="Contoh: sol dilem ulang, garansi berlaku"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>

            {target?.status !== 0 && (
              <p className="text-sm text-muted-foreground">
                Klaim ini sudah diputuskan ({target?.status_label}). Keputusan
                masih bisa diubah antara disetujui dan ditolak, tapi tidak bisa
                dikembalikan ke menunggu.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => putuskan(2)}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tolak
            </Button>
            <Button onClick={() => putuskan(1)} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
