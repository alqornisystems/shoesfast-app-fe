"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
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

type Customer = {
  id: number
  name: string
  phone: string
  address: string
  email: string | null
  photo: string | null
  maps: string | null
  date_of_birth: number | null
  hobby: string | null
  favorite_food: string | null
  behavior: string | null
  is_member?: number
  member_code?: string | null
  member_since?: string | null
  points?: number
  project_ids?: number[]
  project_names?: string[]
}

type Project = {
  id: number
  name: string
}

const STORAGE_KEY_SEARCH = 'member_list_search'
const STORAGE_KEY_PAGE = 'member_list_page'

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export function MemberClient() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [nonMembers, setNonMembers] = useState<Customer[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
    from: 0,
    to: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [initialized, setInitialized] = useState(false)

  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [memberSearch, setMemberSearch] = useState("")
  const [loadingNonMembers, setLoadingNonMembers] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchCustomers(page = 1, searchQuery = search) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '25',
        is_member: '1', // Filter hanya member
      })
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      const json = await api.get<any>(`/api/customers?${params.toString()}`)
      setCustomers(json.data ?? [])
      setPagination({
        current_page: json.current_page ?? 1,
        last_page: json.last_page ?? 1,
        per_page: json.per_page ?? 25,
        total: json.total ?? 0,
        from: json.from ?? 0,
        to: json.to ?? 0,
      })

      // Save current page to sessionStorage
      sessionStorage.setItem(STORAGE_KEY_PAGE, String(json.current_page ?? 1))
    } catch {
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchProjects() {
    try {
      const json = await api.get<any>("/api/projects")
      setProjects(json.data ?? [])
    } catch {
      setProjects([])
    }
  }

  async function fetchNonMembers(searchQuery = "") {
    setLoadingNonMembers(true)
    try {
      const params = new URLSearchParams({
        is_member: '0',
        per_page: searchQuery.trim() ? '100' : '5', // Limit 5 di awal, 100 saat search
      })
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      const json = await api.get<any>(`/api/customers?${params.toString()}`)
      setNonMembers(json.data ?? [])
    } catch {
      setNonMembers([])
    } finally {
      setLoadingNonMembers(false)
    }
  }

  async function handlePromoteToMember() {
    if (selectedCustomers.length === 0) return

    setPromoting(true)
    try {
      // Promote semua customer yang dipilih jadi member
      await Promise.all(
        selectedCustomers.map(async (customerId) => {
          // Get customer data first
          const customer = nonMembers.find(c => c.id === customerId)
          if (!customer) return

          const memberCode = `MBR${Date.now()}${customerId}`
          const memberSince = new Date().toISOString().split('T')[0]

          // Send full customer data with member fields updated
          return api.put(`/api/customers/${customerId}`, {
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            email: customer.email || null,
            photo: customer.photo || null,
            maps: customer.maps || null,
            date_of_birth: customer.date_of_birth || null,
            hobby: customer.hobby || null,
            favorite_food: customer.favorite_food || null,
            behavior: customer.behavior || null,
            is_member: true,
            member_code: memberCode,
            member_since: memberSince,
            points: 0,
            project_ids: customer.project_ids || [],
          })
        })
      )

      setAddMemberDialogOpen(false)
      setSelectedCustomers([])
      fetchCustomers(pagination.current_page)
    } catch (error) {

    } finally {
      setPromoting(false)
    }
  }

  function openAddMemberDialog() {
    setSelectedCustomers([])
    setMemberSearch("")
    fetchNonMembers("") // Fetch 5 pelanggan awal
    setAddMemberDialogOpen(true)
  }

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || ''
    const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE) || '1', 10)

    setSearch(savedSearch)
    setInitialized(true)
    fetchCustomers(savedPage, savedSearch)
    fetchProjects()
  }, [])

  // Search with debounce (for member list)
  useEffect(() => {
    if (!initialized) return

    sessionStorage.setItem(STORAGE_KEY_SEARCH, search)

    const timer = setTimeout(() => {
      fetchCustomers(1, search)
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  // Search with debounce (for non-member dialog)
  useEffect(() => {
    if (!addMemberDialogOpen) return

    const timer = setTimeout(() => {
      fetchNonMembers(memberSearch)
    }, 500)

    return () => clearTimeout(timer)
  }, [memberSearch, addMemberDialogOpen])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/customers/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchCustomers(pagination.current_page)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Member</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data member Shoesfast.
          </p>
        </div>
        <Button onClick={openAddMemberDialog} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Member
        </Button>
      </div>

      {/* Table card */}
      <div className="rounded-xl border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari member..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} member
          </Badge>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center hidden md:table-cell">#</TableHead>
              <TableHead>Member</TableHead>
              <TableHead className="hidden lg:table-cell">Member Sejak</TableHead>
              <TableHead className="hidden xl:table-cell text-right">Poin</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Belum ada data member.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer, idx) => (
                <TableRow key={customer.id}>
                  <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                    {pagination.from + idx}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={customer.photo || undefined} />
                        <AvatarFallback className="text-xs font-semibold">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium">{customer.name}</div>
                        {customer.member_code && (
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {customer.member_code}
                          </div>
                        )}
                        {customer.project_names && customer.project_names.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {customer.project_names.map((name, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs py-0 h-5">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {/* Show member_since & points on mobile */}
                        <div className="flex items-center gap-2 mt-1 lg:hidden">
                          {customer.member_since && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(customer.member_since).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          {customer.points !== undefined && (
                            <Badge variant="secondary" className="text-xs py-0 h-5">
                              {customer.points} poin
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm hidden lg:table-cell">
                    {customer.member_since
                      ? new Date(customer.member_since).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-right hidden xl:table-cell">
                    <Badge variant="secondary" className="text-xs py-0 h-5">
                      {customer.points ?? 0} poin
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(customer)}
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
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} pelanggan
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCustomers(pagination.current_page - 1)}
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
                onClick={() => fetchCustomers(pagination.current_page + 1)}
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

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Tambah Member Baru</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Pilih pelanggan yang akan dijadikan member
            </p>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau nomor telepon..."
              className="pl-9"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
          </div>

          {/* Customer List */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px] max-h-[400px]">
            {loadingNonMembers ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : nonMembers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {memberSearch ? (
                  <>
                    <p>Tidak ada hasil untuk &quot;{memberSearch}&quot;</p>
                    <p className="text-xs mt-1">Coba kata kunci lain</p>
                  </>
                ) : (
                  <>
                    <p>Tidak ada pelanggan non-member.</p>
                    <p className="text-xs mt-1">Semua pelanggan sudah menjadi member.</p>
                  </>
                )}
              </div>
            ) : (
              nonMembers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    if (selectedCustomers.includes(customer.id)) {
                      setSelectedCustomers(selectedCustomers.filter((id) => id !== customer.id))
                    } else {
                      setSelectedCustomers([...selectedCustomers, customer.id])
                    }
                  }}
                >
                  <Checkbox
                    id={`customer-${customer.id}`}
                    checked={selectedCustomers.includes(customer.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCustomers([...selectedCustomers, customer.id])
                      } else {
                        setSelectedCustomers(selectedCustomers.filter((id) => id !== customer.id))
                      }
                    }}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={customer.photo || undefined} />
                    <AvatarFallback className="text-xs font-semibold">
                      {customer.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{customer.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">{customer.phone}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {selectedCustomers.length > 0 && `${selectedCustomers.length} dipilih`}
            </div>
            <DialogClose asChild>
              <Button variant="outline" disabled={promoting}>Batal</Button>
            </DialogClose>
            <Button
              onClick={handlePromoteToMember}
              disabled={promoting || selectedCustomers.length === 0}
              className="gap-1.5"
            >
              {promoting && <Loader2 className="h-4 w-4 animate-spin" />}
              Jadikan Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pelanggan?</AlertDialogTitle>
            <AlertDialogDescription>
              Pelanggan <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> akan dihapus.
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
