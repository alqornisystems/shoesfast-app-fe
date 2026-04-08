"use client"

import { useEffect, useState } from "react"
import { Search, History, Package, Phone, User, Filter, Calendar } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"

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
  modified_at: number | null
}

export function HistoriClient() {
  const [sends, setSends] = useState<Send[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  async function fetchSends() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== "all") {
        params.append('type', typeFilter)
      }
      if (startDate) {
        params.append('start_date', startDate)
      }
      if (endDate) {
        params.append('end_date', endDate)
      }

      const res = await api.get<{ data: Send[] }>(`/api/sends/history?${params.toString()}`)
      setSends(res.data ?? [])
    } catch {
      setSends([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Set default date range (last 30 days)
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const formatDate = (date: Date) => {
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    setStartDate(formatDate(thirtyDaysAgo))
    setEndDate(formatDate(today))
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchSends()
    }
  }, [typeFilter, startDate, endDate])

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  function formatDateTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
          <h1 className="text-2xl font-bold tracking-tight">Histori Pengiriman</h1>
          <p className="text-sm text-muted-foreground">
            Riwayat pickup & delivery yang sudah selesai
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tanggal Mulai</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tanggal Akhir</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tipe</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9">
                <Filter className="h-3.5 w-3.5 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="0">Pickup</SelectItem>
                <SelectItem value="1">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Cari</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Badge variant="secondary">
            {filteredSends.length} pengiriman
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tipe</TableHead>
              <TableHead>Order / Item</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden lg:table-cell">Kurir</TableHead>
              <TableHead className="hidden md:table-cell">Tanggal</TableHead>
              <TableHead className="hidden xl:table-cell">Diselesaikan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                </TableRow>
              ))
            ) : filteredSends.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <History className="h-10 w-10 text-muted-foreground/50" />
                    <p>Tidak ada histori pengiriman.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSends.map((send) => (
                <TableRow key={send.id}>
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
                  <TableCell className="hidden xl:table-cell">
                    <div className="text-sm text-muted-foreground">
                      {send.modified_at ? formatDateTime(send.modified_at) : "-"}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
