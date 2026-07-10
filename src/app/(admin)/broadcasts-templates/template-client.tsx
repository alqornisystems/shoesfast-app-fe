"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Search, Loader2, X, ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { api } from "@/lib/api"
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
  DialogClose,
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
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type BroadcastTemplate = {
  id: number
  name: string
  content: string
  variables: string[]
  branch_name: string
  created_by: string
  created_at: number
  broadcasts_count: number
}

type FormState = {
  name: string
  content: string
}

type ErrorState = Partial<Record<keyof FormState, string>>

const emptyForm: FormState = {
  name: "",
  content: "",
}

type PaginationData = {
  current_page: number
  total_pages: number
  per_page: number
  total: number
}

const STORAGE_KEY_SEARCH = "broadcast_template_list_search"
const STORAGE_KEY_PAGE = "broadcast_template_list_page"

export function TemplateClient() {
  const [templates, setTemplates] = useState<BroadcastTemplate[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    total_pages: 1,
    per_page: 20,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [initialized, setInitialized] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BroadcastTemplate | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<ErrorState>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<BroadcastTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchTemplates(page = 1, searchQuery = search) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '20',
      })
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      const json = await api.get<any>(`/api/broadcasts/templates?${params.toString()}`)
      setTemplates(json.data ?? [])
      const pag: PaginationData = json.pagination ?? {
        current_page: 1,
        total_pages: 1,
        per_page: 20,
        total: 0,
      }
      setPagination(pag)
      sessionStorage.setItem(STORAGE_KEY_PAGE, String(pag.current_page ?? 1))
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || ""
    const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE) || "1", 10)
    setSearch(savedSearch)
    setInitialized(true)
    fetchTemplates(savedPage, savedSearch)
  }, [])

  // Search with debounce
  useEffect(() => {
    if (!initialized) return
    sessionStorage.setItem(STORAGE_KEY_SEARCH, search)

    const timer = setTimeout(() => {
      fetchTemplates(1, search)
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(template: BroadcastTemplate) {
    setEditTarget(template)
    setForm({
      name: template.name,
      content: template.content,
    })
    setErrors({})
    setDialogOpen(true)
  }

  async function handleSave() {
    const errs: ErrorState = {}
    if (!form.name.trim()) errs.name = "Nama template wajib diisi."
    if (!form.content.trim()) errs.content = "Isi template wajib diisi."

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSaving(true)
    setErrors({})
    try {
      const payload = {
        name: form.name.trim(),
        content: form.content.trim(),
      }

      if (editTarget) {
        await api.put(`/api/broadcasts/templates/${editTarget.id}`, payload)
        toast.success("Template berhasil diperbarui")
      } else {
        await api.post("/api/broadcasts/templates", payload)
        toast.success("Template berhasil dibuat")
      }

      setDialogOpen(false)
      fetchTemplates(pagination.current_page)
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]> }
      if (e?.errors) {
        const apiErrs: ErrorState = {}
        Object.keys(e.errors).forEach((key) => {
          apiErrs[key as keyof FormState] = e.errors![key][0]
        })
        setErrors(apiErrs)
      } else {
        toast.error("Gagal menyimpan template")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/broadcasts/templates/${deleteTarget.id}`)
      toast.success("Template berhasil dihapus")
      setDeleteTarget(null)
      fetchTemplates(pagination.current_page)
    } catch {
      toast.error("Gagal menghapus template")
    } finally {
      setDeleting(false)
    }
  }

  function insertPlaceholder(placeholder: string) {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement
    if (!textarea) return

    const startPos = textarea.selectionStart
    const endPos = textarea.selectionEnd
    const textBefore = form.content.substring(0, startPos)
    const textAfter = form.content.substring(endPos)

    const newContent = textBefore + placeholder + textAfter
    setForm({ ...form, content: newContent })

    // Set cursor position after placeholder
    setTimeout(() => {
      textarea.focus()
      const cursorPos = startPos + placeholder.length
      textarea.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }

  function formatDate(timestamp: number) {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(timestamp * 1000))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Template Broadcast</h1>
          <p className="text-sm text-muted-foreground">
            Kelola template pesan WhatsApp untuk broadcast.
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Buat Template
        </Button>
      </div>

      {/* Table card */}
      <div className="rounded-xl border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari template..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} template
          </Badge>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-[300px]">Template</TableHead>
                <TableHead className="w-24 text-center">Variabel</TableHead>
                <TableHead className="w-20 text-center">Digunakan</TableHead>
                <TableHead className="w-20 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-full max-w-md" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    {search ? "Tidak ada template yang sesuai dengan pencarian." : "Belum ada template broadcast."}
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template, idx) => (
                  <TableRow key={template.id}>
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {(pagination.current_page - 1) * pagination.per_page + idx + 1}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="overflow-hidden">
                        <div className="font-medium text-sm truncate">{template.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {template.content}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {template.variables.length > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {template.variables.length}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {template.broadcasts_count}x
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(template)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(template)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Halaman {pagination.current_page} dari {pagination.total_pages} ({pagination.total} template)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTemplates(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>
              <div className="text-sm font-medium px-2">
                {pagination.current_page} / {pagination.total_pages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTemplates(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.total_pages}
                className="h-8 gap-1"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Template" : "Buat Template Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Template <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="Contoh: Promo Akhir Tahun"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value })
                  setErrors({ ...errors, name: undefined })
                }}
                className={cn(errors.name && "border-destructive")}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <Label htmlFor="template-content">Isi Pesan <span className="text-destructive">*</span></Label>
              <div className="mb-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertPlaceholder('{name}')}
                  className="h-7 text-xs"
                >
                  {'{name}'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertPlaceholder('{phone}')}
                  className="h-7 text-xs"
                >
                  {'{phone}'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertPlaceholder('{customer_name}')}
                  className="h-7 text-xs"
                >
                  {'{customer_name}'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertPlaceholder('{order_code}')}
                  className="h-7 text-xs"
                >
                  {'{order_code}'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertPlaceholder('{branch_name}')}
                  className="h-7 text-xs"
                >
                  {'{branch_name}'}
                </Button>
              </div>
              <Textarea
                id="template-content"
                placeholder="Ketik pesan template di sini... Gunakan variabel seperti {name} untuk personalisasi."
                rows={8}
                value={form.content}
                onChange={(e) => {
                  setForm({ ...form, content: e.target.value })
                  setErrors({ ...errors, content: undefined })
                }}
                className={cn("font-mono text-sm", errors.content && "border-destructive")}
              />
              {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
              <p className="text-xs text-muted-foreground">
                Gunakan variabel untuk personalisasi pesan. Contoh: {'{name}'}, {'{phone}'}, {'{customer_name}'}
              </p>
            </div>

            {/* Preview */}
            {form.content && (
              <div className="space-y-1.5">
                <Label>Preview</Label>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-sm whitespace-pre-wrap">{form.content}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Batal</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? "Simpan Perubahan" : "Buat Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> akan dihapus.
              Data ini tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
