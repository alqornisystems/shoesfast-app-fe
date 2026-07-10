# List / Master Page Pattern

**Canonical reference:** `src/app/(admin)/pesanan/order-client.tsx`

Every list/master page (`pelanggan`, `layanan`, `karyawan`, `jabatan`, `cabang`, `member`,
`pembayaran`, `pengeluaran`, `pengerjaan-*`, `pengiriman`, `broadcasts-*`, …) follows this
pattern. When you add or edit a list page, match it. Copy the skeleton at the bottom and
rename `Entity`/`entity`/`entities`/`/api/entities`/`/entity`.

---

## The 10 rules

1. **Thin `page.tsx` + `*-client.tsx`.** `page.tsx` is a one-line server component that renders
   the `"use client"` component. All state, fetching, and CRUD live in `*-client.tsx`.

2. **Fetch through the `api` client only.** `api.get<any>(\`/api/entities?${params}\`)` — never raw
   `fetch`/`process.env`. Paths include the `/api` prefix. Read the Laravel paginator shape from
   the response (`res.data`, `res.current_page`, `res.last_page`, `res.per_page`, `res.total`,
   `res.from`, `res.to`).

3. **Persist search + page in `sessionStorage`** so returning from a detail/edit page restores the
   user's place. Keys: `<entity>_list_search`, `<entity>_list_page`. Restore on mount, save the
   page after each fetch, and save search on change. **This is the rule most existing pages are
   missing — always include it.**

4. **Debounced search, resets to page 1.** A `useEffect` on `search` waits 300 ms then
   `fetchEntities(1)`. Guard it with an `initialized` flag so it doesn't fire during the mount
   restore.

5. **Null-safe relation access.** Any related object may be `null` (walk-in / soft-deleted rows).
   Always render `entity.customer?.name ?? "-"`, never `entity.customer.name`. Unguarded access
   crashes the whole `.map` with *"Cannot read properties of null (reading 'name')"*.

6. **Standard chrome.** Header (`<h1>` title + muted description + primary action button with a
   `Plus` icon) → card wrapper `rounded-xl border bg-card shadow-sm` → toolbar (search input with
   a `Search` icon, `pl-8 h-9`, + total `<Badge>` pinned `ml-auto`) → `<Table>` → pagination
   footer.

7. **Three table states.** `loading` → 5 `<Skeleton>` rows matching the columns; empty
   (`entities.length === 0`) → one `colSpan` row, centered icon + Indonesian message; otherwise
   the mapped rows.

8. **Responsive columns + row number.** Hide secondary columns progressively
   (`hidden sm:table-cell` / `md:` / `lg:` / `xl:`), and show the running number with
   `{pagination.from + idx}`.

9. **Actions = right-aligned ghost icon buttons.** `Pencil` (edit) and `Trash2` (delete),
   `variant="ghost" size="icon"` `h-8 w-8`, each with a `title`. Delete opens an `AlertDialog`
   confirm that names the record, uses the destructive style, and shows a `Loader2` spinner while
   deleting.

10. **Indonesian copy + shared helpers.** All UI text in Indonesian. Use `formatCurrency` /
    `formatDate` from `@/lib/utils` — do not re-declare them per page.

---

## sessionStorage helper (rule 3 in detail)

```tsx
const STORAGE_KEY_SEARCH = "entity_list_search"
const STORAGE_KEY_PAGE = "entity_list_page"

// restore on mount
useEffect(() => {
  const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || ""
  const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE) || "1", 10)
  setSearch(savedSearch)
  setInitialized(true)
  fetchEntities(savedPage)
}, [])

// debounced search → page 1 (skip during mount restore)
useEffect(() => {
  if (!initialized) return
  sessionStorage.setItem(STORAGE_KEY_SEARCH, search)
  const t = setTimeout(() => fetchEntities(1), 300)
  return () => clearTimeout(t)
}, [search])

// inside fetchEntities, after setPagination:
sessionStorage.setItem(STORAGE_KEY_PAGE, String(res.current_page ?? 1))
```

---

## Copy-paste skeleton

```tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Search, Loader2, ChevronLeft, ChevronRight, Package } from "lucide-react"
import { api } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Entity = {
  id: number
  code: string
  // …fields; type relations as `Relation | null`
}

type PaginationData = {
  current_page: number; last_page: number; per_page: number
  total: number; from: number; to: number
}

const STORAGE_KEY_SEARCH = "entity_list_search"
const STORAGE_KEY_PAGE = "entity_list_page"

export function EntityClient() {
  const router = useRouter()
  const [entities, setEntities] = useState<Entity[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1, last_page: 1, per_page: 15, total: 0, from: 0, to: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [initialized, setInitialized] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchEntities(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "15" })
      if (search.trim()) params.append("search", search.trim())

      const res = await api.get<any>(`/api/entities?${params.toString()}`)
      setEntities(res.data ?? [])
      setPagination({
        current_page: res.current_page ?? 1, last_page: res.last_page ?? 1,
        per_page: res.per_page ?? 15, total: res.total ?? 0,
        from: res.from ?? 0, to: res.to ?? 0,
      })
      sessionStorage.setItem(STORAGE_KEY_PAGE, String(res.current_page ?? 1))
    } catch {
      setEntities([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || ""
    const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE) || "1", 10)
    setSearch(savedSearch)
    setInitialized(true)
    fetchEntities(savedPage)
  }, [])

  useEffect(() => {
    if (!initialized) return
    sessionStorage.setItem(STORAGE_KEY_SEARCH, search)
    const t = setTimeout(() => fetchEntities(1), 300)
    return () => clearTimeout(t)
  }, [search])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/entities/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchEntities(pagination.current_page)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entity</h1>
          <p className="text-sm text-muted-foreground">Kelola data entity.</p>
        </div>
        <Button onClick={() => router.push("/entity/create")} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Entity
        </Button>
      </div>

      {/* Card */}
      <div className="rounded-xl border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">{pagination.total} entity</Badge>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 hidden md:table-cell">#</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : entities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-10 w-10 text-muted-foreground/50" />
                    <p>Belum ada data.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entities.map((entity, idx) => (
                <TableRow key={entity.id}>
                  <TableCell className="text-center text-sm text-muted-foreground hidden md:table-cell">
                    {pagination.from + idx}
                  </TableCell>
                  <TableCell className="font-semibold">{entity.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push(`/entity/${entity.id}/edit`)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(entity)} title="Hapus">
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
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} entity
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1"
                onClick={() => fetchEntities(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}>
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>
              <div className="text-sm font-medium px-2">{pagination.current_page} / {pagination.last_page}</div>
              <Button variant="outline" size="sm" className="h-8 gap-1"
                onClick={() => fetchEntities(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}>
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Entity?</AlertDialogTitle>
            <AlertDialogDescription>
              Data <span className="font-semibold text-foreground">"{deleteTarget?.code}"</span> akan dihapus.
              Data ini tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5">
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

The matching `page.tsx`:

```tsx
import { EntityClient } from "./entity-client"

export default function Page() {
  return <EntityClient />
}
```
