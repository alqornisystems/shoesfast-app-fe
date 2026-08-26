"use client"

import { useEffect, useState } from "react"
import { ArrowDownAZ, ArrowUpAZ, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ComboboxPilih } from "@/components/combobox-pilih"
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



  return (
    <>
      {/* Daftar layanan tumbuh terus; menggulir puluhan baris untuk mencari "repaint"
          lebih lambat daripada mengetiknya. */}
      <ComboboxPilih
        value={value.servicesId}
        onChange={(servicesId) => onChange({ ...value, servicesId })}
        options={[
          { value: "all", label: "Semua Layanan" },
          ...services.map((service) => ({ value: String(service.id), label: service.name })),
        ]}
        placeholder="Semua Layanan"
        searchPlaceholder="Cari layanan..."
        emptyText="Layanan tidak ditemukan."
        className="h-9 capitalize sm:w-[190px]"
        icon={<Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      />

      <SortPicker
        sort={value.sort}
        order={value.order}
        onChange={(sort, order) => onChange({ ...value, sort, order })}
        options={sortOptions}
      />
    </>
  )
}

/**
 * Pemilih urutan: satu dropdown kolom + satu tombol pembalik arah.
 *
 * Berdiri sendiri supaya halaman yang tidak punya jenis layanan — antrean penjemputan
 * dan pengantaran, misalnya — memakai kontrol yang persis sama.
 */
export function SortPicker({
  sort,
  order,
  onChange,
  options,
}: {
  sort: string
  order: "asc" | "desc"
  onChange: (sort: string, order: "asc" | "desc") => void
  options: SortOption[]
}) {
  return (
    <div className="flex items-center gap-1">
      <Select value={sort} onValueChange={(next) => onChange(next, order)}>
        <SelectTrigger className="h-9 w-full sm:w-[180px]">
          <SelectValue placeholder="Urutan bawaan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Urutan bawaan</SelectItem>
          {options.map((option) => (
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
        disabled={sort === "default"}
        title={order === "asc" ? "Naik (A-Z / terkecil dulu)" : "Turun (Z-A / terbesar dulu)"}
        onClick={() => onChange(sort, order === "asc" ? "desc" : "asc")}
      >
        {order === "asc" ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
        <span className="sr-only">Balik arah urutan</span>
      </Button>
    </div>
  )
}
