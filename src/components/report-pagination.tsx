'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ReportPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (perPage: number) => void
  isLoading?: boolean
}

export function ReportPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false,
}: ReportPaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const canGoFirst = currentPage > 1 && !isLoading
  const canGoPrevious = currentPage > 1 && !isLoading
  const canGoNext = currentPage < totalPages && !isLoading
  const canGoLast = currentPage < totalPages && !isLoading

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
      {/* Items per page selector */}
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Tampilkan</p>
        <Select
          value={itemsPerPage.toString()}
          onValueChange={(value) => onItemsPerPageChange(Number(value))}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="250">250</SelectItem>
            <SelectItem value="500">500</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">per halaman</p>
      </div>

      {/* Info text */}
      <div className="text-sm text-muted-foreground">
        Menampilkan {startItem} - {endItem} dari {totalItems} data
      </div>

      {/* Pagination buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={!canGoFirst}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          <p className="text-sm font-medium">
            Halaman {currentPage} dari {totalPages}
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoLast}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Simple pagination for smaller datasets (just showing page numbers)
interface SimplePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean
  maxPageButtons?: number
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  maxPageButtons = 5,
}: SimplePaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []

    if (totalPages <= maxPageButtons) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first, last, current and surrounding pages
      const showEllipsisStart = currentPage > 3
      const showEllipsisEnd = currentPage < totalPages - 2

      if (showEllipsisStart) {
        pages.push(1)
        pages.push('...')
      } else {
        for (let i = 1; i < currentPage; i++) {
          pages.push(i)
        }
      }

      // Current page and surrounding
      const start = Math.max(1, currentPage - 1)
      const end = Math.min(totalPages, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }

      if (showEllipsisEnd) {
        pages.push('...')
        pages.push(totalPages)
      } else {
        for (let i = currentPage + 1; i <= totalPages; i++) {
          if (!pages.includes(i)) {
            pages.push(i)
          }
        }
      }
    }

    return pages
  }

  // Kotak isian nomor halaman hanya muncul kalau tombolnya memang tidak cukup.
  // Dengan 100 halaman yang tampil cuma "1 … 4 5 6 … 100", dan halaman 47 tidak bisa
  // dicapai tanpa mengklik puluhan kali.
  const butuhLoncat = totalPages > maxPageButtons

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {getPageNumbers().map((page, idx) => (
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(page as number)}
            disabled={isLoading}
          >
            {page}
          </Button>
        )
      ))}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {butuhLoncat && (
        <PageJumper
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

/**
 * Ketik nomor halaman, tekan Enter (atau keluar dari kotaknya) untuk loncat ke sana.
 *
 * Nilainya ditahan sebagai teks selama diketik supaya kotaknya boleh kosong sejenak;
 * yang dikirim keluar selalu angka yang sudah dijepit ke rentang 1..totalPages, jadi
 * "999" di daftar 12 halaman mendarat di halaman 12, bukan di halaman kosong.
 */
function PageJumper({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading: boolean
}) {
  const [draf, setDraf] = useState(String(currentPage))

  // Pindah halaman lewat tombol panah/nomor harus ikut terlihat di kotaknya.
  useEffect(() => {
    setDraf(String(currentPage))
  }, [currentPage])

  function loncat() {
    const angka = parseInt(draf, 10)

    if (Number.isNaN(angka)) {
      setDraf(String(currentPage))
      return
    }

    const tujuan = Math.min(Math.max(angka, 1), totalPages)
    setDraf(String(tujuan))

    if (tujuan !== currentPage) onPageChange(tujuan)
  }

  return (
    <div className="ml-1 flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground">Ke</span>
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        value={draf}
        disabled={isLoading}
        aria-label={`Loncat ke halaman, 1 sampai ${totalPages}`}
        onChange={(e) => setDraf(e.target.value)}
        onBlur={loncat}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            loncat()
          }
        }}
        className="h-9 w-16 text-center"
      />
      <span className="text-sm text-muted-foreground">/ {totalPages}</span>
    </div>
  )
}
