"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Search, Loader2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
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
import { Skeleton } from "@/components/ui/skeleton"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

type ExpenseOperational = {
  id: number
  name: string
  note: string | null
  cost_basis: string | null
  nominal: number
  created_at: number
  updated_at: number
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export function ExpenseOperationalClient() {
  const [expenses, setExpenses] = useState<ExpenseOperational[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  })
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseOperational | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    note: "",
    cost_basis: "",
    nominal: 0,
  })
  const [nominalDisplay, setNominalDisplay] = useState("")

  useEffect(() => {
    fetchExpenses()
  }, [pagination.current_page])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExpenses(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchExpenses = async (page?: number) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const params = new URLSearchParams({
        page: (page || pagination.current_page).toString(),
        per_page: pagination.per_page.toString(),
      })

      if (search) params.append("search", search)

      const response = await fetch(
        `${API_URL}/api/expense-operationals?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      )

      if (!response.ok) throw new Error("Failed to fetch expenses")

      const result = await response.json()
      setExpenses(result.data || [])
      setPagination({
        current_page: result.current_page,
        last_page: result.last_page,
        per_page: result.per_page,
        total: result.total,
        from: result.from,
        to: result.to,
      })
    } catch (error) {
      toast.error("Gagal memuat data pengeluaran operasional")

    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const handleNominalChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "")
    const parsedValue = parseInt(numericValue) || 0
    setFormData({ ...formData, nominal: parsedValue })
    setNominalDisplay(parsedValue > 0 ? formatNumber(parsedValue) : "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || formData.nominal <= 0) {
      toast.error("Nama dan nominal harus diisi")
      return
    }

    setSaving(true)

    try {
      const token = localStorage.getItem("sf_token")
      const payload = {
        name: formData.name,
        note: formData.note || null,
        cost_basis: formData.cost_basis || null,
        nominal: formData.nominal,
      }

      const url = editingExpense
        ? `${API_URL}/api/expense-operationals/${editingExpense.id}`
        : `${API_URL}/api/expense-operationals`

      const response = await fetch(url, {
        method: editingExpense ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to save expense")

      toast.success(
        editingExpense
          ? "Pengeluaran operasional berhasil diperbarui"
          : "Pengeluaran operasional berhasil ditambahkan"
      )
      setShowForm(false)
      setEditingExpense(null)
      resetForm()
      fetchExpenses()
    } catch (error) {
      toast.error("Gagal menyimpan pengeluaran operasional")

    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (expense: ExpenseOperational) => {
    setEditingExpense(expense)
    setFormData({
      name: expense.name,
      note: expense.note || "",
      cost_basis: expense.cost_basis || "",
      nominal: expense.nominal,
    })
    setNominalDisplay(formatNumber(expense.nominal))
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsLoading(true)

    try {
      const token = localStorage.getItem("sf_token")
      const response = await fetch(
        `${API_URL}/api/expense-operationals/${deleteId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      )

      if (!response.ok) throw new Error("Failed to delete expense")

      toast.success("Pengeluaran operasional berhasil dihapus")
      setIsDeleteDialogOpen(false)
      setDeleteId(null)
      fetchExpenses()
    } catch (error) {
      toast.error("Gagal menghapus pengeluaran operasional")

    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      note: "",
      cost_basis: "",
      nominal: 0,
    })
    setNominalDisplay("")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (showForm) {
    return (
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowForm(false)
              setEditingExpense(null)
              resetForm()
            }}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {editingExpense ? "Edit Pengeluaran Operasional" : "Tambah Pengeluaran Operasional"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {editingExpense ? "Perbarui data pengeluaran operasional tetap" : "Tambahkan pengeluaran operasional tetap"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detail Pengeluaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Pengeluaran <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Sewa Toko, Listrik, Gaji Karyawan"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cost_basis">Dasar Biaya</Label>
                <Input
                  id="cost_basis"
                  value={formData.cost_basis}
                  onChange={(e) => setFormData({ ...formData, cost_basis: e.target.value })}
                  placeholder="Contoh: Per bulan, Per tahun"
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nominal">Nominal <span className="text-destructive">*</span></Label>
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
                    className="pl-10"
                    required
                  />
                </div>
                {formData.nominal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(formData.nominal)}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">Catatan</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Keterangan tambahan (opsional)"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false)
                setEditingExpense(null)
                resetForm()
              }}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingExpense ? "Simpan Perubahan" : "Simpan"}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengeluaran Operasional</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data pengeluaran operasional tetap
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Pengeluaran
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Badge variant="secondary">
            {pagination.total} pengeluaran
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Nama Pengeluaran</TableHead>
              <TableHead>Dasar Biaya</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead className="w-24 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Tidak ada data pengeluaran operasional
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense, idx) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {pagination.from + idx}
                  </TableCell>
                  <TableCell className="font-medium">{expense.name}</TableCell>
                  <TableCell className="text-sm">
                    {expense.cost_basis || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(expense.nominal)}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm truncate">
                      {expense.note || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(expense)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteId(expense.id)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} pengeluaran
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, current_page: prev.current_page - 1 }))}
                disabled={pagination.current_page === 1 || isLoading}
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
                onClick={() => setPagination((prev) => ({ ...prev, current_page: prev.current_page + 1 }))}
                disabled={pagination.current_page === pagination.last_page || isLoading}
                className="h-8 gap-1"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengeluaran Operasional?</AlertDialogTitle>
            <AlertDialogDescription>
              Data pengeluaran operasional akan dihapus permanen. Aksi ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
