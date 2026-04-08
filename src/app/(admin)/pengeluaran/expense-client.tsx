"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Plus, Pencil, Trash2, Search, X, Upload, Loader2, ChevronLeft, ChevronRight, ArrowLeft, Eye, Image as ImageIcon } from "lucide-react"
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
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

type Expense = {
  id: number
  date: number
  note: string
  nominal: number
  photo: string | null
  created_at: number
  updated_at: number
}

type ExpenseItem = {
  id: string
  note: string
  nominal: number
  photo: string | null
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export function ExpenseClient() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Form state for multiple items
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([
    { id: crypto.randomUUID(), note: "", nominal: 0, photo: null },
  ])

  // Single item edit state
  const [editForm, setEditForm] = useState({
    date: "",
    note: "",
    nominal: 0,
    photo: null as string | null,
  })
  const [editNominalDisplay, setEditNominalDisplay] = useState("")

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
        category: "other",
      })

      if (search) params.append("search", search)

      const response = await fetch(`${API_URL}/api/expenses?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })

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
      toast.error("Gagal memuat data pengeluaran")

    } finally {
      setIsLoading(false)
    }
  }

  const handlePhotoChange = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setExpenseItems((items) =>
        items.map((item) =>
          item.id === itemId ? { ...item, photo: base64String } : item
        )
      )
    }
    reader.readAsDataURL(file)
  }

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setEditForm({ ...editForm, photo: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const addExpenseItem = () => {
    setExpenseItems([
      ...expenseItems,
      { id: crypto.randomUUID(), note: "", nominal: 0, photo: null },
    ])
  }

  const removeExpenseItem = (id: string) => {
    if (expenseItems.length === 1) {
      toast.error("Minimal harus ada 1 item pengeluaran")
      return
    }
    setExpenseItems(expenseItems.filter((item) => item.id !== id))
  }

  const updateExpenseItem = (id: string, field: keyof ExpenseItem, value: any) => {
    setExpenseItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const handleNominalChange = (id: string, value: string) => {
    const numericValue = value.replace(/\D/g, "")
    const parsedValue = parseInt(numericValue) || 0
    updateExpenseItem(id, "nominal", parsedValue)
  }

  const handleEditNominalChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "")
    const parsedValue = parseInt(numericValue) || 0
    setEditForm({ ...editForm, nominal: parsedValue })
    setEditNominalDisplay(parsedValue > 0 ? formatNumber(parsedValue) : "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const invalidItems = expenseItems.filter(
      (item) => !item.note.trim() || item.nominal <= 0
    )

    if (invalidItems.length > 0) {
      toast.error("Semua item harus memiliki catatan dan nominal > 0")
      return
    }

    setSaving(true)

    try {
      const token = localStorage.getItem("sf_token")

      // Save each expense item
      const promises = expenseItems.map((item) =>
        fetch(`${API_URL}/api/expenses`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            date,
            note: item.note,
            nominal: item.nominal,
            category: "other",
            photo: item.photo || null,
          }),
        })
      )

      const results = await Promise.all(promises)
      const failedRequests = results.filter((r) => !r.ok)

      if (failedRequests.length > 0) {
        throw new Error(`${failedRequests.length} pengeluaran gagal disimpan`)
      }

      toast.success(`${expenseItems.length} pengeluaran berhasil ditambahkan`)
      setShowForm(false)
      resetForm()
      fetchExpenses()
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan pengeluaran")

    } finally {
      setSaving(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingExpense) return

    if (!editForm.note.trim() || editForm.nominal <= 0) {
      toast.error("Catatan dan nominal harus diisi")
      return
    }

    setSaving(true)

    try {
      const token = localStorage.getItem("sf_token")
      const response = await fetch(`${API_URL}/api/expenses/${editingExpense.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          date: editForm.date,
          note: editForm.note,
          nominal: editForm.nominal,
          category: "other",
          photo: editForm.photo || null,
        }),
      })

      if (!response.ok) throw new Error("Failed to update expense")

      toast.success("Pengeluaran berhasil diperbarui")
      setShowForm(false)
      setEditingExpense(null)
      resetForm()
      fetchExpenses()
    } catch (error) {
      toast.error("Gagal memperbarui pengeluaran")

    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setEditForm({
      date: new Date(expense.date * 1000).toISOString().split("T")[0],
      note: expense.note,
      nominal: expense.nominal,
      photo: expense.photo,
    })
    setEditNominalDisplay(formatNumber(expense.nominal))
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsLoading(true)

    try {
      const token = localStorage.getItem("sf_token")
      const response = await fetch(`${API_URL}/api/expenses/${deleteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to delete expense")

      toast.success("Pengeluaran berhasil dihapus")
      setIsDeleteDialogOpen(false)
      setDeleteId(null)
      fetchExpenses()
    } catch (error) {
      toast.error("Gagal menghapus pengeluaran")

    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0])
    setExpenseItems([
      { id: crypto.randomUUID(), note: "", nominal: 0, photo: null },
    ])
    setEditForm({
      date: "",
      note: "",
      nominal: 0,
      photo: null,
    })
    setEditNominalDisplay("")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getTotalNominal = () => {
    return expenseItems.reduce((sum, item) => sum + item.nominal, 0)
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
              {editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {editingExpense ? "Perbarui data pengeluaran" : "Tambahkan satu atau lebih item pengeluaran"}
            </p>
          </div>
        </div>

        {editingExpense ? (
          // Edit Single Item Form
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detail Pengeluaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-date">Tanggal <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-note">Catatan <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="edit-note"
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                    placeholder="Keterangan pengeluaran..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-nominal">Nominal <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      id="edit-nominal"
                      type="text"
                      placeholder="0"
                      value={editNominalDisplay}
                      onChange={(e) => handleEditNominalChange(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {editForm.nominal > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(editForm.nominal)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bukti Foto</CardTitle>
              </CardHeader>
              <CardContent>
                {editForm.photo ? (
                  <div className="space-y-3">
                    <img
                      src={editForm.photo.startsWith('data:') ? editForm.photo : (editForm.photo.startsWith('http') ? editForm.photo : `/${editForm.photo}`)}
                      alt="Bukti"
                      className="w-full h-64 rounded-lg object-cover border"
                      loading="lazy"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditForm({ ...editForm, photo: null })}
                      className="w-full gap-1.5"
                    >
                      <X className="h-4 w-4" />
                      Hapus Foto
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary cursor-pointer transition-colors bg-muted/30 hover:bg-muted/50"
                    onClick={() => document.getElementById('edit-photo')?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-muted p-4">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Klik untuk upload foto</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG hingga 2MB</p>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  id="edit-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleEditPhotoChange}
                />
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
                Simpan Perubahan
              </Button>
            </div>
          </form>
        ) : (
          // Add Multiple Items Form
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tanggal Pengeluaran</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Daftar Pengeluaran</CardTitle>
                  <Button type="button" size="sm" variant="outline" onClick={addExpenseItem} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {expenseItems.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg space-y-3 bg-card">
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary">Item #{index + 1}</Badge>
                      {expenseItems.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeExpenseItem(item.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5 col-span-2">
                        <Label>Catatan <span className="text-destructive">*</span></Label>
                        <Textarea
                          value={item.note}
                          onChange={(e) => updateExpenseItem(item.id, "note", e.target.value)}
                          placeholder="Keterangan pengeluaran..."
                          rows={2}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Nominal <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            Rp
                          </span>
                          <Input
                            type="text"
                            placeholder="0"
                            value={item.nominal > 0 ? formatNumber(item.nominal) : ""}
                            onChange={(e) => handleNominalChange(item.id, e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                        {item.nominal > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.nominal)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label>Bukti Foto</Label>
                        {item.photo ? (
                          <div className="relative">
                            <img
                              src={item.photo}
                              alt="Bukti"
                              className="w-full h-24 rounded object-cover border"
                              loading="lazy"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => updateExpenseItem(item.id, "photo", null)}
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary cursor-pointer transition-colors bg-muted/30 hover:bg-muted/50"
                            onClick={() => {
                              const input = document.getElementById(`photo-${item.id}`) as HTMLInputElement
                              input?.click()
                            }}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Upload className="h-5 w-5 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Upload foto</p>
                            </div>
                          </div>
                        )}
                        <input
                          id={`photo-${item.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoChange(item.id, e)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {expenseItems.length > 0 && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <span className="font-semibold">Total:</span>
                    <span className="text-lg font-bold">{formatCurrency(getTotalNominal())}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan {expenseItems.length} Item
              </Button>
            </div>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengeluaran Umum</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data pengeluaran umum perusahaan
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
              placeholder="Cari catatan..."
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
              <TableHead>Tanggal</TableHead>
              <TableHead>Bukti</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead className="w-24 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Tidak ada data pengeluaran
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense, idx) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {pagination.from + idx}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(expense.date)}
                  </TableCell>
                  <TableCell>
                    {expense.photo ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 gap-1.5"
                        onClick={() => setPreviewImage(expense.photo!.startsWith('http') ? expense.photo : `/${expense.photo}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Lihat
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm truncate">{expense.note}</p>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(expense.nominal)}
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

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bukti Pengeluaran</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage}
              alt="Bukti pengeluaran"
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              loading="lazy"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengeluaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Data pengeluaran akan dihapus permanen. Aksi ini tidak dapat dibatalkan.
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
