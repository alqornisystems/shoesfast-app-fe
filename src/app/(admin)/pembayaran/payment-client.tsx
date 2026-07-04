"use client"

import { useEffect, useState, useRef } from "react"
import { Search, Loader2, Plus, ChevronLeft, ChevronRight, HandCoins, AlertCircle, CheckCircle2, Clock, Calendar, Upload, X, Printer } from "lucide-react"
import { api } from "@/lib/api"
import { downloadInvoicePDF } from "@/lib/invoice-utils"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Payment = {
  id: number
  code: string
  date: number
  due_date: number
  total_price: number
  total_paid: number
  credit: number
  late: string
  payment_status: "paid" | "partial" | "unpaid"
  customer: {
    id: number
    name: string
    phone: string
    email: string | null
    address: string
  }
  payment: {
    id: number
    date: number
    nominal: number
    note: string | null
  } | null
  project_name: string | null
  created_at: number
}

type OrderItemRow = {
  name?: string | null
  price?: number | string | null
  treatments?: { name?: string | null }[]
}

type PaymentRow = {
  date: number
  nominal?: number | string | null
  note?: string | null
}

type PaymentHistoryRow = {
  id?: number
  date: number
  nominal: number
  note?: string | null
  photo?: string | null
}

type PaymentListResponse = {
  data?: Payment[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
  from?: number
  to?: number
}

type UnpaidOrder = {
  id: number
  code: string
  date: number
  total_price: number
  total_paid: number
  credit: number
  customer_name: string
  customer_phone: string
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export function PaymentClient() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("unpaid_partial")

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Payment | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    orders_id: 0,
    date: new Date().toISOString().split('T')[0],
    nominal: 0,
    note: "",
    photo: null as string | null,
  })
  const [nominalDisplay, setNominalDisplay] = useState("")
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [printingId, setPrintingId] = useState<number | null>(null)

  async function handlePrintInvoice(order: Payment) {
    setPrintingId(order.id)
    try {
      // Pull order line items + full payment history for the invoice
      const [itemsRes, historyRes] = await Promise.all([
        api.get<OrderItemRow[] | { data: OrderItemRow[] }>(`/api/orders/${order.id}/items`),
        api.get<PaymentRow[] | { data: PaymentRow }>(`/api/payments/order/${order.id}`),
      ])

      const itemsArr: OrderItemRow[] = Array.isArray(itemsRes) ? itemsRes : itemsRes.data ?? []
      const items = itemsArr.map((it) => ({
        name: it.name ?? "-",
        services: (it.treatments ?? [])
          .map((t) => t?.name)
          .filter(Boolean)
          .join(", "),
        price: Number(it.price) || 0,
      }))

      const histArr: PaymentRow[] = Array.isArray(historyRes)
        ? historyRes
        : historyRes.data
        ? [historyRes.data]
        : []
      const payments = histArr.map((p) => ({
        date: p.date,
        nominal: Number(p.nominal) || 0,
        note: p.note ?? null,
      }))

      downloadInvoicePDF({
        code: order.code,
        date: order.date,
        dueDate: order.due_date,
        status: order.payment_status,
        branchName: order.project_name,
        customer: order.customer,
        items,
        totalPrice: order.total_price,
        totalPaid: order.total_paid,
        credit: order.credit,
        payments,
      })
      toast.success("Invoice berhasil dibuat")
    } catch {
      toast.error("Gagal mencetak invoice")
    } finally {
      setPrintingId(null)
    }
  }

  async function fetchPayments(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(15),
      })

      if (search.trim()) params.append('search', search.trim())

      // Handle filter status
      if (statusFilter === 'unpaid_partial') {
        // Filter untuk belum lunas dan cicilan (default)
        params.append('status', 'unpaid,partial')
      } else if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const res = await api.get<PaymentListResponse>(`/api/payments?${params.toString()}`)
      setPayments(res.data ?? [])
      setPagination({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        per_page: res.per_page ?? 15,
        total: res.total ?? 0,
        from: res.from ?? 0,
        to: res.to ?? 0,
      })
    } catch {
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  async function openPaymentDialog(order: Payment) {
    setSelectedOrder(order)

    // Fetch payment history
    await fetchPaymentHistory(order.id)

    // Set form for new payment
    const nominal = order.credit
    setPaymentForm({
      orders_id: order.id,
      date: new Date().toISOString().split('T')[0],
      nominal: nominal,
      note: "",
      photo: null,
    })
    setNominalDisplay(formatNumber(nominal))
    setErrors({})
    setPaymentDialogOpen(true)
  }

  async function fetchPaymentHistory(orderId: number) {
    setLoadingHistory(true)
    try {
      const res = await api.get<PaymentHistoryRow[] | { data: PaymentHistoryRow }>(`/api/payments/order/${orderId}`)
      setPaymentHistory(Array.isArray(res) ? res : (res.data ? [res.data] : []))
    } catch (error) {

      setPaymentHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, photo: "Ukuran file maksimal 2MB." })
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setPaymentForm({ ...paymentForm, photo: reader.result as string })
      setErrors({ ...errors, photo: "" })
    }
    reader.readAsDataURL(file)
  }

  async function handleSavePayment() {
    const errs: Record<string, string> = {}
    if (!paymentForm.date) errs.date = "Tanggal wajib diisi"
    if (!paymentForm.nominal || paymentForm.nominal <= 0) errs.nominal = "Nominal harus lebih dari 0"

    if (Object.keys(errs).length) {
      setErrors(errs)
      toast.error("Mohon lengkapi form")
      return
    }

    setSaving(true)
    setErrors({})

    try {
      await api.post('/api/payments', {
        orders_id: paymentForm.orders_id,
        date: paymentForm.date,
        nominal: paymentForm.nominal,
        note: paymentForm.note || null,
        photo: paymentForm.photo || null,
      })

      toast.success("Pembayaran berhasil disimpan!")
      setPaymentDialogOpen(false)
      fetchPayments(pagination.current_page)
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string>; message?: string }
      if (e?.errors) {
        setErrors(e.errors)
      }
      toast.error(e?.message || "Gagal menyimpan pembayaran. Silakan coba lagi.")
    } finally {
      setSaving(false)
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  function handleNominalChange(value: string) {
    const numericValue = value.replace(/\D/g, "")
    const parsedValue = parseInt(numericValue) || 0

    setPaymentForm({ ...paymentForm, nominal: parsedValue })
    setNominalDisplay(parsedValue > 0 ? formatNumber(parsedValue) : "")

    // Clear error when typing
    if (errors.nominal) {
      const { nominal, ...rest } = errors
      setErrors(rest)
    }
  }

  const STATUS_CONFIG = {
    paid: { label: "Lunas", variant: "outline" as const, icon: CheckCircle2, color: "text-green-600" },
    partial: { label: "Cicil", variant: "default" as const, icon: Clock, color: "text-blue-600" },
    unpaid: { label: "Belum Bayar", variant: "destructive" as const, icon: AlertCircle, color: "text-red-600" },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pembayaran</h1>
          <p className="text-sm text-muted-foreground">
            Kelola pembayaran dari customer.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode / customer..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] h-9">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid_partial">Belum Lunas & Cicil</SelectItem>
              <SelectItem value="unpaid">Belum Bayar</SelectItem>
              <SelectItem value="partial">Cicil</SelectItem>
              <SelectItem value="paid">Lunas</SelectItem>
              <SelectItem value="all">Semua Status</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} pesanan
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 hidden md:table-cell">#</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="hidden lg:table-cell">Customer</TableHead>
              <TableHead className="hidden xl:table-cell">Total</TableHead>
              <TableHead className="hidden md:table-cell">Dibayar</TableHead>
              <TableHead className="hidden sm:table-cell">Sisa</TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <HandCoins className="h-10 w-10 text-muted-foreground/50" />
                    <p>Tidak ada data pembayaran.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment, idx) => {
                const statusConfig = STATUS_CONFIG[payment.payment_status]
                const StatusIcon = statusConfig.icon

                return (
                  <TableRow key={payment.id}>
                    <TableCell className="text-center text-sm text-muted-foreground hidden md:table-cell">
                      {pagination.from + idx}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{payment.code}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(payment.date)}
                        </div>
                        {payment.late !== "-" && (
                          <div className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                            <AlertCircle className="h-3 w-3" />
                            Terlambat {payment.late}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="max-w-[200px]">
                        <div className="font-medium text-sm truncate">{payment.customer.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{payment.customer.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="font-semibold text-sm">{formatCurrency(payment.total_price)}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm text-green-600 font-medium">{formatCurrency(payment.total_paid)}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className={cn("text-sm font-semibold", payment.credit > 0 ? "text-red-600" : "text-green-600")}>
                        {formatCurrency(payment.credit)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={statusConfig.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {payment.credit > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => openPaymentDialog(payment)}
                          >
                            <HandCoins className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Bayar</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => openPaymentDialog(payment)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Lihat</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5"
                          title="Cetak Invoice"
                          disabled={printingId === payment.id}
                          onClick={() => handlePrintInvoice(payment)}
                        >
                          {printingId === payment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Printer className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden lg:inline">Invoice</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} pesanan
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPayments(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>
              <div className="text-sm font-medium px-2">
                {pagination.current_page} / {pagination.last_page}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPayments(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
                className="h-8 gap-1"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.payment_status === 'paid' ? 'History Pembayaran' : 'Input Pembayaran'}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.payment_status === 'paid'
                ? 'Riwayat pembayaran pesanan ini'
                : 'Masukkan detail pembayaran dari customer'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedOrder && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{selectedOrder.code}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{selectedOrder.customer.name}</div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {formatDate(selectedOrder.date)}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total</div>
                    <div className="font-semibold text-sm">{formatCurrency(selectedOrder.total_price)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Terbayar</div>
                    <div className="font-semibold text-sm text-green-600">{formatCurrency(selectedOrder.total_paid)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Sisa</div>
                    <div className={cn("font-semibold text-sm", selectedOrder.credit > 0 ? "text-red-600" : "text-green-600")}>
                      {formatCurrency(selectedOrder.credit)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment History */}
            {(selectedOrder?.payment_status === 'paid' || selectedOrder?.payment_status === 'partial') && paymentHistory.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Riwayat Pembayaran</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {paymentHistory.map((history, idx) => (
                    <div key={history.id || idx} className="p-3 border rounded-lg bg-card">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-green-600">
                            {formatCurrency(history.nominal)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(history.date)}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          Pembayaran #{idx + 1}
                        </Badge>
                      </div>
                      {history.note && (
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          {history.note}
                        </p>
                      )}
                      {history.photo && (
                        <div className="mt-2 pt-2 border-t">
                          <img
                            src={history.photo.startsWith('http') ? history.photo : `/${history.photo}`}
                            alt="Bukti pembayaran"
                            className="w-full h-32 rounded object-cover border"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Input - Only show if not paid */}
            {selectedOrder?.payment_status !== 'paid' && (
              <>

            <div className="space-y-1.5">
              <Label htmlFor="date">Tanggal Pembayaran <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => {
                    setPaymentForm({ ...paymentForm, date: e.target.value })
                    const { date, ...rest } = errors
                    setErrors(rest)
                  }}
                  className={cn("pl-9", errors.date && "border-destructive")}
                />
              </div>
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nominal">Nominal Pembayaran <span className="text-destructive">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="nominal"
                  type="text"
                  placeholder="0"
                  value={nominalDisplay}
                  onChange={(e) => handleNominalChange(e.target.value)}
                  className={cn("pl-10", errors.nominal && "border-destructive")}
                />
              </div>
              {errors.nominal && <p className="text-xs text-destructive">{errors.nominal}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Catatan</Label>
              <Textarea
                id="note"
                placeholder="Catatan pembayaran (opsional)"
                value={paymentForm.note}
                onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Bukti Pembayaran</Label>
              <div className="flex flex-col gap-3">
                {paymentForm.photo ? (
                  <div className="relative">
                    <img
                      src={paymentForm.photo}
                      alt="Bukti pembayaran"
                      className="w-full h-48 rounded-lg object-cover border"
                      loading="lazy"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setPaymentForm({ ...paymentForm, photo: null })
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      className="absolute top-2 right-2 gap-1"
                    >
                      <X className="h-3 w-3" />
                      Hapus
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary cursor-pointer transition-colors bg-muted/30 hover:bg-muted/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-muted p-3">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Klik untuk upload foto</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG hingga 2MB</p>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                {errors.photo && <p className="text-xs text-destructive">{errors.photo}</p>}
              </div>
            </div>
            </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={saving}
            >
              {selectedOrder?.payment_status === 'paid' ? 'Tutup' : 'Batal'}
            </Button>
            {selectedOrder && (
              <Button
                variant="outline"
                className="gap-1.5"
                disabled={printingId === selectedOrder.id}
                onClick={() => handlePrintInvoice(selectedOrder)}
              >
                {printingId === selectedOrder.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Cetak Invoice
              </Button>
            )}
            {selectedOrder?.payment_status !== 'paid' && (
              <Button
                onClick={handleSavePayment}
                disabled={saving}
                className="gap-1.5 bg-green-600 hover:bg-green-700"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <HandCoins className="h-4 w-4" />
                Simpan Pembayaran
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
