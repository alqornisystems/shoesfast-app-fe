"use client"

import { useEffect, useState } from "react"
import { Send, Search, Loader2, ChevronLeft, ChevronRight, FileText, Users, Calendar, Eye, Trash2, CheckCircle2, XCircle } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type BroadcastHistory = {
  id: number
  template_name: string
  branch_name: string
  recipients_count: number
  sent_to: string
  sent_by: string
  sent_at: number
}

type BroadcastTemplate = {
  id: number
  name: string
  content: string
  variables: string[]
}

type Recipient = {
  id: number
  name: string
  phone: string
  branch?: string
}

type PaginationData = {
  current_page: number
  total_pages: number
  per_page: number
  total: number
}

const STORAGE_KEY_SEARCH = 'broadcast_send_list_search'
const STORAGE_KEY_PAGE = 'broadcast_send_list_page'
const STORAGE_KEY_TAB = 'broadcast_send_list_tab'

export function SendClient() {
  const [activeTab, setActiveTab] = useState("send")
  const [initialized, setInitialized] = useState(false)

  // History state
  const [history, setHistory] = useState<BroadcastHistory[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    total_pages: 1,
    per_page: 20,
    total: 0,
  })
  const [loading, setLoading] = useState(false)

  // Send broadcast state
  const [templates, setTemplates] = useState<BroadcastTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<BroadcastTemplate | null>(null)
  const [recipientType, setRecipientType] = useState<"all" | "selected" | "customers">("all")
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([])
  const [searchRecipient, setSearchRecipient] = useState("")
  const [sending, setSending] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [renderedMessage, setRenderedMessage] = useState("")

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<BroadcastHistory | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  async function fetchHistory(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '20',
      })
      const json = await api.get<any>(`/api/broadcasts?${params.toString()}`)
      setHistory(json.data ?? [])
      setPagination(json.pagination ?? {
        current_page: 1,
        total_pages: 1,
        per_page: 20,
        total: 0,
      })

      // Save current page to sessionStorage
      sessionStorage.setItem(STORAGE_KEY_PAGE, String(json.pagination?.current_page ?? 1))
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchTemplates() {
    try {
      const json = await api.get<any>('/api/broadcasts/templates?per_page=100')
      setTemplates(json.data ?? [])
    } catch {
      setTemplates([])
    }
  }

  async function fetchRecipients(type: "users" | "customers") {
    try {
      const json = await api.get<any>(`/api/broadcasts/recipients?type=${type}`)
      setRecipients(json.data ?? [])
    } catch {
      setRecipients([])
    }
  }

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || ''
    const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE) || '1', 10)
    const savedTab = sessionStorage.getItem(STORAGE_KEY_TAB) || 'send'

    setSearchRecipient(savedSearch)
    setActiveTab(savedTab)
    setInitialized(true)
    fetchHistory(savedPage)
    fetchTemplates()
  }, [])

  // Persist active tab
  useEffect(() => {
    if (!initialized) return
    sessionStorage.setItem(STORAGE_KEY_TAB, activeTab)
  }, [activeTab])

  // Persist recipient search (client-side filter, no server fetch)
  useEffect(() => {
    if (!initialized) return
    sessionStorage.setItem(STORAGE_KEY_SEARCH, searchRecipient)
  }, [searchRecipient])

  useEffect(() => {
    if (recipientType === "selected") {
      fetchRecipients("users")
    } else if (recipientType === "customers") {
      fetchRecipients("customers")
    }
  }, [recipientType])

  async function handlePreview() {
    if (!selectedTemplate) {
      toast.error("Pilih template terlebih dahulu")
      return
    }

    try {
      const json = await api.post<any>('/api/broadcasts/preview', {
        template_id: selectedTemplate.id,
      })
      setRenderedMessage(json.rendered_message)
      setPreviewOpen(true)
    } catch {
      toast.error("Gagal memuat preview")
    }
  }

  async function handleSend() {
    if (!selectedTemplate) {
      toast.error("Pilih template terlebih dahulu")
      return
    }

    if (recipientType !== "all" && selectedRecipients.length === 0) {
      toast.error("Pilih minimal 1 penerima")
      return
    }

    setSending(true)
    try {
      const payload: any = {
        broadcasts_templates_id: selectedTemplate.id,
        recipient_type: recipientType,
      }

      if (recipientType === "selected" || recipientType === "customers") {
        payload.recipient_ids = selectedRecipients
      }

      const json = await api.post<any>('/api/broadcasts/send', payload)

      toast.success(json.message || "Broadcast berhasil dikirim", {
        description: json.data?.wablas_enabled
          ? `${json.data.sent_count} pesan terkirim, ${json.data.failed_count} gagal`
          : "Mode simulasi (Wablas disabled)",
      })

      // Reset form
      setSelectedTemplate(null)
      setRecipientType("all")
      setSelectedRecipients([])
      setSearchRecipient("")

      // Refresh history
      fetchHistory(1)

      // Switch to history tab
      setActiveTab("history")
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengirim broadcast")
    } finally {
      setSending(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/broadcasts/${deleteTarget.id}`)
      toast.success("Riwayat broadcast berhasil dihapus")
      setDeleteTarget(null)
      fetchHistory(pagination.current_page)
    } catch {
      toast.error("Gagal menghapus riwayat")
    } finally {
      setDeleting(false)
    }
  }

  async function handleViewDetail(id: number) {
    setLoadingDetail(true)
    setDetailOpen(true)
    try {
      const json = await api.get<any>(`/api/broadcasts/${id}`)
      setDetailData(json)
    } catch {
      toast.error("Gagal memuat detail")
      setDetailOpen(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  function formatDate(timestamp: number) {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp * 1000))
  }

  function toggleRecipient(id: number) {
    setSelectedRecipients(prev =>
      prev.includes(id)
        ? prev.filter(r => r !== id)
        : [...prev, id]
    )
  }

  function toggleAll() {
    if (selectedRecipients.length === filteredRecipients.length) {
      setSelectedRecipients([])
    } else {
      setSelectedRecipients(filteredRecipients.map(r => r.id))
    }
  }

  const filteredRecipients = recipients.filter(r =>
    r.name.toLowerCase().includes(searchRecipient.toLowerCase()) ||
    r.phone.includes(searchRecipient)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Broadcast WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Kirim pesan broadcast ke pelanggan atau karyawan.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            Kirim Broadcast
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="h-4 w-4" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        {/* SEND TAB */}
        <TabsContent value="send" className="space-y-6">
          <div className="rounded-xl border bg-card shadow-sm p-6">
            <div className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label>Template Pesan <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !selectedTemplate && "text-muted-foreground"
                      )}
                    >
                      {selectedTemplate ? (
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {selectedTemplate.name}
                        </span>
                      ) : (
                        "Pilih template..."
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cari template..." />
                      <CommandList>
                        <CommandEmpty>Template tidak ditemukan</CommandEmpty>
                        <CommandGroup>
                          {templates.map((template) => (
                            <CommandItem
                              key={template.id}
                              onSelect={() => {
                                setSelectedTemplate(template)
                              }}
                              className="gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              <div className="flex-1">
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {template.content}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedTemplate && (
                  <div className="mt-2 rounded-lg border bg-muted/50 p-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</p>
                  </div>
                )}
              </div>

              {/* Recipient Type */}
              <div className="space-y-3">
                <Label>Penerima <span className="text-destructive">*</span></Label>
                <RadioGroup value={recipientType} onValueChange={(v: any) => setRecipientType(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="font-normal cursor-pointer">
                      Semua Pengguna (Karyawan)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="selected" id="selected" />
                    <Label htmlFor="selected" className="font-normal cursor-pointer">
                      Pilih Pengguna Tertentu
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="customers" id="customers" />
                    <Label htmlFor="customers" className="font-normal cursor-pointer">
                      Pilih Pelanggan
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Recipient Selection */}
              {(recipientType === "selected" || recipientType === "customers") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      {recipientType === "customers" ? "Pilih Pelanggan" : "Pilih Pengguna"}
                    </Label>
                    <Badge variant="secondary">
                      {selectedRecipients.length} terpilih
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={`Cari ${recipientType === "customers" ? "pelanggan" : "pengguna"}...`}
                        className="pl-8"
                        value={searchRecipient}
                        onChange={(e) => setSearchRecipient(e.target.value)}
                      />
                    </div>
                    <div className="rounded-lg border max-h-64 overflow-y-auto">
                      <div className="p-2 border-b bg-muted/50">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="select-all"
                            checked={selectedRecipients.length === filteredRecipients.length && filteredRecipients.length > 0}
                            onCheckedChange={toggleAll}
                          />
                          <Label htmlFor="select-all" className="font-medium cursor-pointer">
                            Pilih Semua ({filteredRecipients.length})
                          </Label>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        {filteredRecipients.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {searchRecipient ? "Tidak ada hasil" : "Belum ada data"}
                          </p>
                        ) : (
                          filteredRecipients.map((recipient) => (
                            <div
                              key={recipient.id}
                              className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50"
                            >
                              <Checkbox
                                id={`recipient-${recipient.id}`}
                                checked={selectedRecipients.includes(recipient.id)}
                                onCheckedChange={() => toggleRecipient(recipient.id)}
                              />
                              <Label
                                htmlFor={`recipient-${recipient.id}`}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="font-medium">{recipient.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {recipient.phone}
                                  {recipient.branch && ` • ${recipient.branch}`}
                                </div>
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={!selectedTemplate}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview Pesan
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || !selectedTemplate}
                  className="gap-2 ml-auto"
                >
                  {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Send className="h-4 w-4" />
                  Kirim Broadcast
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <div className="rounded-xl border bg-card shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Badge variant="secondary">
                {pagination.total} riwayat
              </Badge>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center hidden md:table-cell">#</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">Penerima</TableHead>
                  <TableHead className="hidden xl:table-cell">Dikirim Oleh</TableHead>
                  <TableHead className="hidden xl:table-cell">Waktu</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                      <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Belum ada riwayat broadcast.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                        {(pagination.current_page - 1) * pagination.per_page + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{item.template_name}</div>
                            <div className="text-xs text-muted-foreground xl:hidden">
                              {item.recipients_count} penerima • {formatDate(item.sent_at)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        <Badge variant="outline">
                          {item.recipients_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm">
                        {item.sent_by}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {formatDate(item.sent_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleViewDetail(item.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(item)}
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

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Halaman {pagination.current_page} dari {pagination.total_pages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchHistory(pagination.current_page - 1)}
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
                    onClick={() => fetchHistory(pagination.current_page + 1)}
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
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview Pesan</DialogTitle>
            <DialogDescription>
              Contoh pesan yang akan dikirim (dengan data sampel)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm whitespace-pre-wrap">{renderedMessage}</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Tutup</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Broadcast</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : detailData ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Template</Label>
                  <p className="font-medium">{detailData.template?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cabang</Label>
                  <p className="font-medium">{detailData.branch_name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jumlah Penerima</Label>
                  <p className="font-medium">{detailData.recipients_count || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Dikirim Oleh</Label>
                  <p className="font-medium">{detailData.sent_by || "-"}</p>
                </div>
              </div>
              {detailData.template?.content && (
                <div>
                  <Label className="text-muted-foreground">Isi Pesan</Label>
                  <div className="mt-2 rounded-lg border bg-muted/50 p-3">
                    <p className="text-sm whitespace-pre-wrap">{detailData.template.content}</p>
                  </div>
                </div>
              )}
              {detailData.recipients && detailData.recipients.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Daftar Penerima</Label>
                  <div className="mt-2 rounded-lg border max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>No. Telepon</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailData.recipients.map((r: any, idx: number) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Tutup</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Riwayat Broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              Riwayat broadcast dengan template <span className="font-semibold text-foreground">"{deleteTarget?.template_name}"</span> akan dihapus.
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
