"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Loader2, Search, Ticket } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { formatDate, titleCase } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SimplePagination } from "@/components/list-pagination"
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
import { Input } from "@/components/ui/input"
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

type Redemption = {
  id: number
  code: string
  customer_name: string | null
  reward_name: string | null
  points_spent: number
  status: number
  status_label: string
  date: number
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

const STORAGE_KEY_SEARCH = "penukaran_list_search"
const STORAGE_KEY_PAGE = "penukaran_list_page"

export function RedemptionClient() {
  const [rows, setRows] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("semua")
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
    from: 0,
    to: 0,
  })

  const [target, setTarget] = useState<Redemption | null>(null)
  const [completing, setCompleting] = useState(false)

  const initialized = useRef(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetchRows = useCallback(
    async (page: number, keyword: string, statusFilter: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: "25",
          ...(keyword ? { search: keyword } : {}),
          ...(statusFilter !== "semua" ? { status: statusFilter } : {}),
        })
        const res = await api.get<{ data: Redemption[] } & PaginationData>(
          `/api/redemptions?${params}`
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
        toast.error("Gagal memuat daftar penukaran")
        setRows([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) ?? ""
    const savedPage = Number(sessionStorage.getItem(STORAGE_KEY_PAGE) ?? "1")
    setSearch(savedSearch)
    fetchRows(savedPage, savedSearch, "semua").finally(() => {
      initialized.current = true
    })
    // Pelanggan datang ke konter menyebut kodenya, jadi kolom pencarian yang
    // langsung siap diketik — bukan pelengkap, ini fungsi utama halaman ini.
    searchRef.current?.focus()
  }, [fetchRows])

  useEffect(() => {
    if (!initialized.current) return
    const t = setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY_SEARCH, search)
      fetchRows(1, search, status)
    }, 300)
    return () => clearTimeout(t)
  }, [search, status, fetchRows])

  async function handleComplete() {
    if (!target) return
    setCompleting(true)
    try {
      await api.post(`/api/redemptions/${target.id}/complete`)
      toast.success("Penukaran ditandai sudah diambil")
      setTarget(null)
      fetchRows(pagination.current_page, search, status)
    } catch {
      toast.error("Gagal menandai penukaran")
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Penukaran Poin</h1>
        <p className="text-muted-foreground">
          Cari kode yang ditunjukkan pelanggan, lalu tandai sudah diambil.
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              className="h-9 pl-8"
              placeholder="Ketik kode atau nama pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua status</SelectItem>
              <SelectItem value="0">Menunggu diambil</SelectItem>
              <SelectItem value="1">Sudah diambil</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto">
            {pagination.total} penukaran
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead className="hidden sm:table-cell">Hadiah</TableHead>
              <TableHead className="hidden md:table-cell">Poin</TableHead>
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
                  <Ticket className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {search
                      ? `Tidak ada penukaran yang cocok dengan "${search}".`
                      : "Belum ada penukaran poin."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-medium">
                    {r.code}
                  </TableCell>
                  {/* Null-safe: pelanggan dan hadiah bisa terhapus setelah
                      penukaran terjadi. */}
                  <TableCell>{titleCase(r.customer_name) || "-"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {titleCase(r.reward_name) || "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {r.points_spent}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.status === 1 ? "outline" : "secondary"}
                    >
                      {r.status_label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDate(r.date)}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 0 && (
                      <Button size="sm" onClick={() => setTarget(r)}>
                        <Check className="mr-1 h-4 w-4" />
                        Tandai diambil
                      </Button>
                    )}
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
              onPageChange={(halaman) => fetchRows(halaman , search, status)}
            />
          </div>
        )}
      </div>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Serahkan hadiah ke pelanggan?</AlertDialogTitle>
            <AlertDialogDescription>
              Kode <span className="font-mono font-medium">{target?.code}</span>{" "}
              atas nama {titleCase(target?.customer_name) || "-"} untuk hadiah{" "}
              {titleCase(target?.reward_name) || "-"}. Poinnya sudah dipotong saat
              pelanggan menukar, jadi tindakan ini hanya mencatat serah terima.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completing}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={completing}>
              {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tandai sudah diambil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
