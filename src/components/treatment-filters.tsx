"use client"

import { useEffect, useState } from "react"
import { ArrowDownAZ, ArrowUpAZ, Check, ChevronsUpDown, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, titleCase } from "@/lib/utils"

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
  const [layananTerbuka, setLayananTerbuka] = useState(false)

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

  const terpilih = services.find((service) => String(service.id) === value.servicesId)

  function pilihLayanan(servicesId: string) {
    setLayananTerbuka(false)
    onChange({ ...value, servicesId })
  }

  return (
    <>
      {/* Combobox, bukan Select biasa: daftar layanan tumbuh terus dan menggulir
          puluhan baris untuk mencari "repaint" lebih lambat daripada mengetiknya. */}
      <Popover open={layananTerbuka} onOpenChange={setLayananTerbuka}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={layananTerbuka}
            className="h-9 w-full justify-between font-normal sm:w-[190px]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate capitalize">{titleCase(terpilih?.name) || "Semua Layanan"}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari layanan..." />
            <CommandList>
              <CommandEmpty>Layanan tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem value="Semua Layanan" onSelect={() => pilihLayanan("all")}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.servicesId === "all" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  Semua Layanan
                </CommandItem>
                {services.map((service) => (
                  <CommandItem
                    key={service.id}
                    value={service.name}
                    onSelect={() => pilihLayanan(String(service.id))}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.servicesId === String(service.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="capitalize">{titleCase(service.name)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
