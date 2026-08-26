"use client"

import { useEffect, useState } from "react"
import { ArrowDownAZ, ArrowUpAZ, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SortOption = {
  /** Nilai `sort` yang dikirim ke /api/treatments — harus ada di daftar putih SORTABLE backend. */
  value: string
  label: string
}

export type TreatmentFilterValue = {
  servicesId: string
  sort: string
  order: "asc" | "desc"
}

type Service = { id: number; name: string }

/**
 * Saringan jenis layanan + pemilih urutan, dipakai bersama oleh Waiting List,
 * Pengerjaan, dan Histori.
 *
 * Pengurutan lewat satu dropdown, bukan header kolom yang bisa diklik: sebagian besar
 * kolom di ketiga tabel disembunyikan di layar kecil (`hidden lg:table-cell`), dan
 * header yang tidak terlihat tidak bisa diklik. Dropdown tetap menjangkau semua kolom
 * di ponsel.
 */
export function TreatmentFilters({
  value,
  onChange,
  sortOptions,
}: {
  value: TreatmentFilterValue
  onChange: (next: TreatmentFilterValue) => void
  sortOptions: SortOption[]
}) {
  const [services, setServices] = useState<Service[]>([])

  useEffect(() => {
    let batal = false

    async function ambil() {
      try {
        const { api } = await import("@/lib/api")
        const res = await api.get<{ data?: Service[] }>("/api/services?per_page=100")
        if (!batal) setServices(res.data ?? [])
      } catch {
        // Daftar layanan gagal dimuat: dropdown-nya tinggal "Semua Layanan", dan
        // halamannya tetap jalan tanpa saringan. Bukan alasan menampilkan error.
        if (!batal) setServices([])
      }
    }

    ambil()

    return () => {
      batal = true
    }
  }, [])

  const arahBerikutnya = value.order === "asc" ? "desc" : "asc"

  return (
    <>
      <Select
        value={value.servicesId}
        onValueChange={(servicesId) => onChange({ ...value, servicesId })}
      >
        <SelectTrigger className="h-9 w-full sm:w-[190px]">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Semua Layanan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Layanan</SelectItem>
          {services.map((service) => (
            <SelectItem key={service.id} value={String(service.id)}>
              {service.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Select value={value.sort} onValueChange={(sort) => onChange({ ...value, sort })}>
          <SelectTrigger className="h-9 w-full sm:w-[180px]">
            <SelectValue placeholder="Urutan bawaan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Urutan bawaan</SelectItem>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={value.sort === "default"}
          title={value.order === "asc" ? "Naik (A-Z / terkecil dulu)" : "Turun (Z-A / terbesar dulu)"}
          onClick={() => onChange({ ...value, order: arahBerikutnya })}
        >
          {value.order === "asc" ? (
            <ArrowUpAZ className="h-4 w-4" />
          ) : (
            <ArrowDownAZ className="h-4 w-4" />
          )}
          <span className="sr-only">Balik arah urutan</span>
        </Button>
      </div>
    </>
  )
}
