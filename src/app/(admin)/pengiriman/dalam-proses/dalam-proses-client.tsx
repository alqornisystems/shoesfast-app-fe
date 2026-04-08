"use client"

import { useEffect, useState } from "react"
import { Search, Loader2, CheckCircle2, Package, MapPin, Phone, Truck, User, Filter } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Complete dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completing, setCompleting] = useState(false)

  async function fetchSends() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== "all") {
        params.append('type', typeFilter)
      }

      const res = await api.get<{ data: Send[] }>(`/api/sends/in-progress?${params.toString()}`)
      setSends(res.data ?? [])
    } catch {
      setSends([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSends()
  }, [typeFilter])

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengiriman Dalam Proses</h1>
          <p className="text-sm text-muted-foreground">
            Daftar pickup & delivery yang sedang dalam perjalanan
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={openCompleteDialog} size="sm" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Selesaikan ({selectedIds.length})
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
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
              <TableHead className="text-right">Aksi</TableHead>
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
                      <div className="font-semibold text-sm">{send.order_code || "-"}</div>
                      {send.item_name && (
                        <div className="text-xs text-muted-foreground">{send.item_name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{send.customer_name || "-"}</div>
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
      </div>

      {/* Complete Confirmation Dialog */}
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
