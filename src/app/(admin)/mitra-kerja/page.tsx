"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { UserCheck, Plus, Search, Edit, Trash2, Phone, MapPin, CreditCard } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

const API_URL = process.env.NEXT_PUBLIC_API_URL

interface Partnership {
  id: number
  name: string
  phone: string
  address: string | null
  account_number: string | null
  branch_name: string
  created_at: number
}

interface FormData {
  id?: number
  name: string
  phone: string
  address: string
  account_number: string
}

export default function MitraKerjaPage() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    total_pages: 0,
  })

  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    address: "",
    account_number: "",
  })

  useEffect(() => {
    fetchPartnerships()
  }, [pagination.current_page, searchQuery])

  const fetchPartnerships = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const params = new URLSearchParams({
        page: String(pagination.current_page),
        per_page: String(pagination.per_page),
      })
      if (searchQuery) params.append("search", searchQuery)

      const response = await fetch(`${API_URL}/api/partnerships?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      setPartnerships(data.data)
      setPagination(data.pagination)
    } catch (error: any) {
      toast.error("Gagal memuat data mitra kerja")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem("sf_token")
      const url = editMode
        ? `${API_URL}/api/partnerships/${formData.id}`
        : `${API_URL}/api/partnerships`

      const response = await fetch(url, {
        method: editMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to save")
      }

      toast.success(editMode ? "Mitra kerja berhasil diperbarui" : "Mitra kerja berhasil ditambahkan")
      setDialogOpen(false)
      resetForm()
      fetchPartnerships()
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan data")
    }
  }

  const handleEdit = (partnership: Partnership) => {
    setFormData({
      id: partnership.id,
      name: partnership.name,
      phone: partnership.phone,
      address: partnership.address || "",
      account_number: partnership.account_number || "",
    })
    setEditMode(true)
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus mitra kerja ini?")) return

    try {
      const token = localStorage.getItem("sf_token")
      const response = await fetch(`${API_URL}/api/partnerships/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete")
      }

      toast.success("Mitra kerja berhasil dihapus")
      fetchPartnerships()
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus data")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      address: "",
      account_number: "",
    })
    setEditMode(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination({ ...pagination, current_page: 1 })
    fetchPartnerships()
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mitra Kerja</h1>
        <p className="text-muted-foreground">Kelola data mitra kerja dan vendor</p>
      </div>

      {/* Search & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, telepon, alamat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit">Cari</Button>
            </form>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Mitra Kerja
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Partnerships Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Mitra Kerja</CardTitle>
          <CardDescription>Total: {pagination.total} mitra kerja</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
          ) : partnerships.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm text-muted-foreground">Belum ada data mitra kerja</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>Rekening</TableHead>
                      <TableHead>Cabang</TableHead>
                      <TableHead>Ditambahkan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partnerships.map((partnership) => (
                      <TableRow key={partnership.id}>
                        <TableCell className="font-medium">{partnership.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {partnership.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          {partnership.address ? (
                            <div className="flex items-start gap-1 text-sm max-w-xs">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{partnership.address}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {partnership.account_number ? (
                            <div className="flex items-center gap-1 text-sm">
                              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                              {partnership.account_number}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{partnership.branch_name}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(partnership.created_at * 1000), "dd MMM yyyy", {
                            locale: idLocale,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(partnership)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(partnership.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Halaman {pagination.current_page} dari {pagination.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.current_page === 1}
                      onClick={() =>
                        setPagination({ ...pagination, current_page: pagination.current_page - 1 })
                      }
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.current_page === pagination.total_pages}
                      onClick={() =>
                        setPagination({ ...pagination, current_page: pagination.current_page + 1 })
                      }
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Mitra Kerja" : "Tambah Mitra Kerja"}</DialogTitle>
            <DialogDescription>
              {editMode ? "Perbarui informasi mitra kerja" : "Tambahkan mitra kerja baru"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nama Mitra Kerja <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="PT Mitra Sejahtera"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Nomor Telepon <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="081234567890"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat lengkap mitra kerja"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Nomor Rekening</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="1234567890 (BCA)"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}
              >
                Batal
              </Button>
              <Button type="submit">{editMode ? "Simpan Perubahan" : "Tambah"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
