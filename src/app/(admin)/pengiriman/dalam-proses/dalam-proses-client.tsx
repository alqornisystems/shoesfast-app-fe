"use client"

import { useEffect, useState } from "react"
import { Search, Loader2, CheckCircle2, Package, MapPin, Phone, Truck, User, Filter, Route } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatCurrency, titleCase, waLink } from "@/lib/utils"
import { bacaKoordinat, posisiSekarang, tautanRute, urutkanTerdekat, MAKS_TITIK, type Titik } from "@/lib/route-utils"
import { Button } from "@/components/ui/button"
import { SimplePagination } from "@/components/list-pagination"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

type SendDetail = {
  order_code: string | null
  // null saat harga belum ditentukan — pesanan dari portal pelanggan lahir tanpa harga
  // dan petugas menetapkannya setelah barang diperiksa.
  total_price: number | null
  total_paid: number | string
  credit: number | string | null
  payment_status: "paid" | "partial" | "unpaid" | "unpriced"
  customer_name: string | null
  item_name: string | null
  item_photo: string | null
  item_note: string | null
  kelengkapan: { nama: string; ada: boolean }[]
  pengerjaan: { nama: string | null; status: number; teknisi: string | null; mulai: number | null; selesai: number | null }[]
}

type Paginator = {
  data: Send[]
  current_page: number
  last_page: number
  from: number | null
  to: number | null
  total: number
}

type Send = {
  id: number
  date: number
  type: number
  type_label: string
  status: number
  courier_name: string | null
  courier_phone: string | null
  order_code: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  customer_maps: string | null
  item_name: string | null
  project_name: string | null
  created_at: number
}

export function DalamProsesClient() {
  const [sends, setSends] = useState<Send[]>([])
  const [menyusunRute, setMenyusunRute] = useState(false)
  const [detail, setDetail] = useState<SendDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [memuatDetail, setMemuatDetail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  // Endpoint ini kini paginator, sebentuk dengan /treatments. Tanpa state ini layar
  // hanya menampilkan 15 baris pertama dan kantor tidak punya petunjuk ada sisanya.
  const [pagination, setPagination] = useState({
    current_page: 1, last_page: 1, from: 0, to: 0, total: 0,
  })

  // Complete dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completing, setCompleting] = useState(false)

  async function fetchSends(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(page))
      if (typeFilter !== "all") {
        params.append('type', typeFilter)
      }
      // Pencarian dikerjakan server sejak daftar ini dipaginasi. Menyaring di klien hanya
      // menyaring halaman yang sedang terbuka — tugas yang dicari ada di halaman tiga dan
      // hasilnya tampak kosong.
      if (search.trim()) {
        params.append('search', search.trim())
      }

      const res = await api.get<Paginator>(`/api/sends/in-progress?${params.toString()}`)
      setSends(res.data ?? [])
      setPagination({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        from: res.from ?? 0,
        to: res.to ?? 0,
        total: res.total ?? 0,
      })
    } catch {
      setSends([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSends()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter])

  // Jeda 300ms: tanpa itu tiap huruf yang diketik menembak satu permintaan.
  useEffect(() => {
    const timer = setTimeout(() => fetchSends(1), 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function toggleSelection(id: number) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectedIds.length === filteredSends.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredSends.map(s => s.id))
    }
  }


  /**
   * Susun rute dari pengiriman yang dicentang, lalu buka Google Maps.
   *
   * Urutan dihitung di sini (tetangga-terdekat dari posisi kurir) karena Google memakai
   * waypoint persis sesuai urutan yang dikirim lewat tautan.
   *
   * Maps baru dibuka SETELAH rutenya siap — tidak ada tab kosong yang menganga selama izin
   * lokasi ditunggu. Risikonya window.open bisa diblokir karena tidak lagi langsung menempel
   * pada klik; kalau itu terjadi, kita pindah di tab yang sama, bukan diam saja.
   */
  async function handleGenerateRute() {
    const dipilih = sends.filter(s => selectedIds.includes(s.id))
    const titik: Titik[] = []
    const tanpaKoordinat: string[] = []

    for (const s of dipilih) {
      const koordinat = bacaKoordinat(s.customer_maps)
      if (koordinat) {
        titik.push({ id: s.id, label: s.customer_name ?? "-", ...koordinat })
      } else {
        tanpaKoordinat.push(s.customer_name ?? "-")
      }
    }

    // Dua paket ke alamat yang sama tidak perlu jadi dua titik singgah. Dikelompokkan per
    // koordinat (dibulatkan 5 desimal ~1 meter), label digabung supaya kurir tetap tahu ada
    // berapa kiriman di situ.
    const perAlamat = new Map<string, Titik>()
    for (const t of titik) {
      const kunci = `${t.lat.toFixed(5)},${t.lng.toFixed(5)}`
      const ada = perAlamat.get(kunci)
      if (ada) ada.label = `${ada.label}, ${t.label}`
      else perAlamat.set(kunci, { ...t })
    }
    const digabung = Array.from(perAlamat.values())
    const bergabung = titik.length - digabung.length
    titik.length = 0
    titik.push(...digabung)

    if (titik.length === 0) {
      toast.error("Tidak ada titik yang bisa dirutekan", {
        description: "Pengiriman yang dipilih belum punya lokasi peta pelanggan.",
      })
      return
    }

    setMenyusunRute(true)
    try {
      const awal = await posisiSekarang()
      const urutan = urutkanTerdekat(awal, titik).slice(0, MAKS_TITIK - 1)
      const url = tautanRute(awal, urutan)

      const jendela = window.open(url, "_blank")
      if (!jendela) window.location.href = url

      const catatan: string[] = []
      if (bergabung > 0) {
        catatan.push(`${bergabung} kiriman digabung karena alamatnya sama`)
      }
      if (titik.length > urutan.length) {
        catatan.push(`${titik.length - urutan.length} titik tidak muat (batas Google Maps ${MAKS_TITIK} titik)`)
      }
      if (tanpaKoordinat.length > 0) {
        catatan.push(`${tanpaKoordinat.length} pelanggan tanpa lokasi peta: ${tanpaKoordinat.join(", ")}`)
      }
      toast.success(`Rute ${urutan.length} titik dibuka`, {
        description: catatan.length > 0 ? catatan.join(". ") : "Diurutkan dari yang terdekat.",
        duration: catatan.length > 0 ? 8000 : 4000,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyusun rute")
    } finally {
      setMenyusunRute(false)
    }
  }


  // Hanya delivery yang punya barang untuk ditinjau; pickup belum membawa apa-apa.
  async function bukaDetail(send: Send) {
    if (send.type !== 1) return
    setDetailOpen(true)
    setMemuatDetail(true)
    setDetail(null)
    try {
      setDetail(await api.get<SendDetail>(`/api/sends/${send.id}/detail`))
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e?.message || "Gagal memuat rincian barang")
      setDetailOpen(false)
    } finally {
      setMemuatDetail(false)
    }
  }

  function openCompleteDialog() {
    if (selectedIds.length === 0) {
      toast.warning("Pilih minimal 1 pengiriman", {
        description: "Centang pengiriman yang ingin diselesaikan",
        duration: 3000,
      })
      return
    }
    setCompleteDialogOpen(true)
  }

  async function handleComplete() {
    if (selectedIds.length === 0) return

    setCompleting(true)
    try {
      // Complete sends using the correct backend endpoint
      await api.post('/api/sends/mark-completed', {
        ids: selectedIds
      })

      toast.success(`${selectedIds.length} pengiriman berhasil diselesaikan`, {
        duration: 3000,
      })

      setCompleteDialogOpen(false)
      setSelectedIds([])
      fetchSends()
    } catch (error: any) {
      toast.error("Gagal menyelesaikan pengiriman", {
        description: error?.error || "Terjadi kesalahan",
        duration: 4000,
      })
    } finally {
      setCompleting(false)
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Filter sends by search
  const filteredSends = sends.filter(send => {
    const searchLower = search.toLowerCase()
    return (
      send.order_code?.toLowerCase().includes(searchLower) ||
      send.customer_name?.toLowerCase().includes(searchLower) ||
      send.customer_phone?.toLowerCase().includes(searchLower) ||
      send.courier_name?.toLowerCase().includes(searchLower) ||
      send.item_name?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengiriman Dalam Proses</h1>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            Daftar pickup & delivery yang sedang dalam perjalanan
          </p>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerateRute}
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={menyusunRute}
          >
            {menyusunRute ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
            Generate Rute
          </Button>
          <Button onClick={openCompleteDialog} size="sm" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Selesaikan ({selectedIds.length})
          </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-3 sm:gap-3 sm:px-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari order / customer / kurir..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="0">Pickup</SelectItem>
              <SelectItem value="1">Delivery</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">
            {filteredSends.length} pengiriman
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === filteredSends.length && filteredSends.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Order / Item</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden lg:table-cell">Kurir</TableHead>
              <TableHead className="hidden md:table-cell">Tanggal</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredSends.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-10 w-10 text-muted-foreground/50" />
                    <p>Tidak ada pengiriman dalam proses.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSends.map((send) => {
                const isSelected = selectedIds.includes(send.id)
                return (
                  <TableRow
                    key={send.id}
                    className={isSelected ? "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500" : ""}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(send.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={send.type === 0 ? "default" : "secondary"} className="font-medium">
                        {send.type_label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {send.type === 1 ? (
                        /* Delivery: barangnya yang dicari kurir, jadi nama barang di atas dan
                           nomor invoice jadi keterangan di bawahnya. Pickup sebaliknya —
                           barangnya belum ada di tangan, yang dipegang baru nomor invoice. */
                        <>
                          <button
                            type="button"
                            onClick={() => bukaDetail(send)}
                            className="text-left text-sm font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                          >
                            {titleCase(send.item_name) || "-"}
                          </button>
                          <div className="text-xs text-muted-foreground">{send.order_code || "-"}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-semibold">{send.order_code || "-"}</div>
                          {send.item_name && (
                            <div className="text-xs text-muted-foreground">{titleCase(send.item_name)}</div>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Nama dirapikan kapitalisasinya (data lama campur huruf besar-kecil) dan
                          jadi tautan WhatsApp — kurir sering perlu memastikan alamat atau
                          kehadiran penerima sebelum berangkat. */}
                      {waLink(send.customer_phone) ? (
                        <a
                          href={waLink(send.customer_phone, `Halo ${titleCase(send.customer_name)}, saya dari kurir Shoesfast mau konfirmasi beberapa hal.`) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-green-700 underline underline-offset-2 hover:text-green-800"
                        >
                          {titleCase(send.customer_name) || "-"}
                        </a>
                      ) : (
                        <div className="text-sm font-medium">{titleCase(send.customer_name) || "-"}</div>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {send.customer_phone || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{send.courier_name || "-"}</div>
                          {send.courier_phone && (
                            <div className="text-xs text-muted-foreground">{send.courier_phone}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(send.date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedIds([send.id])
                          setCompleteDialogOpen(true)
                        }}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Selesai
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Kaki paginasi — pola yang sama dengan halaman Pesanan. */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} pengiriman
            </div>
            <SimplePagination
              currentPage={pagination.current_page}
              totalPages={pagination.last_page}
              onPageChange={(halaman) => fetchSends(halaman)}
              isLoading={loading}
            />
          </div>
        )}
      </div>

      {/* Complete Confirmation Dialog */}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rincian Barang</DialogTitle>
          </DialogHeader>
          {memuatDetail ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <div className="space-y-5">
              <div className="flex gap-3">
                {detail.item_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.item_photo} alt={detail.item_name ?? ""} className="h-20 w-20 rounded-lg border object-cover" />
                ) : null}
                <div className="min-w-0">
                  <div className="font-semibold">{titleCase(detail.item_name) || "-"}</div>
                  <div className="text-sm text-muted-foreground">{detail.order_code ?? "-"} · {detail.customer_name ?? "-"}</div>
                  {detail.item_note ? (
                    <div className="mt-1 text-xs text-muted-foreground">Catatan: {detail.item_note}</div>
                  ) : null}
                </div>
              </div>

              {/* Status pembayaran: kurir yang mengantar perlu tahu masih ada tagihan atau tidak. */}
              <div className={`rounded-lg border px-3 py-2.5 ${
                detail.payment_status === "paid"
                  ? "border-green-200 bg-green-50"
                  : detail.payment_status === "unpriced"
                    // Bukan merah: belum berharga bukan tunggakan, dan mewarnainya seperti
                    // tunggakan membuat kurir menagih pelanggan yang belum ditagih apa pun.
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50"
              }`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold">
                    {detail.payment_status === "paid"
                      ? "LUNAS"
                      : detail.payment_status === "unpriced"
                        ? "HARGA BELUM DITENTUKAN"
                        : detail.payment_status === "partial"
                          ? "BELUM LUNAS"
                          : "BELUM BAYAR"}
                  </span>
                  {Number(detail.credit) > 0 ? (
                    <span className="text-sm font-bold text-red-700">
                      Kurang {formatCurrency(Number(detail.credit))}
                    </span>
                  ) : null}
                </div>
                {Number(detail.credit) > 0 ? (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Total {formatCurrency(Number(detail.total_price))} · terbayar {formatCurrency(Number(detail.total_paid))}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pengerjaan</div>
                <div className="mt-2 space-y-1.5">
                  {detail.pengerjaan.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Belum ada pengerjaan tercatat.</div>
                  ) : detail.pengerjaan.map((p, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-3 border-b pb-1.5 text-sm last:border-b-0">
                      <div>
                        <div>{p.nama ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.teknisi ?? "Belum ada teknisi"}
                          {p.selesai ? ` · selesai ${formatDate(p.selesai)}` : p.mulai ? ` · mulai ${formatDate(p.mulai)}` : ""}
                        </div>
                      </div>
                      <Badge variant={p.status >= 2 ? "default" : "secondary"}>
                        {p.status >= 2 ? "Selesai" : p.status === 1 ? "Siap QC" : "Dikerjakan"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kelengkapan</div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-sm">
                  {detail.kelengkapan.map((k, i) => (
                    <div key={i} className={k.ada ? "" : "text-muted-foreground line-through"}>
                      {k.ada ? "✓" : "—"} {k.nama}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Selesaikan {selectedIds.length} Pengiriman?</AlertDialogTitle>
            <AlertDialogDescription>
              Konfirmasi bahwa {selectedIds.length} pengiriman ini telah selesai. Status order/item akan diupdate secara otomatis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completing}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              disabled={completing}
              className="gap-2"
            >
              {completing && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, Selesaikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
