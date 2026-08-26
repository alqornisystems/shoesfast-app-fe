"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"

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
import { cn } from "@/lib/utils"

export type PilihanCombobox = {
  value: string
  label: string
  /** Baris kecil di bawah label — nomor HP, jabatan, apa pun yang membedakan dua nama yang mirip. */
  hint?: string | null
}

/**
 * Dropdown yang bisa diketik, untuk daftar yang isinya datang dari database.
 *
 * Select biasa memaksa menggulir; begitu daftar kurir atau layanan lewat sepuluh baris,
 * mengetik tiga huruf selalu lebih cepat. Dipakai untuk daftar dinamis saja — pilihan
 * status yang cuma tiga baris justru lebih lambat kalau harus mengetik dulu.
 *
 * Pencarian mencakup label DAN hint, jadi kurir bisa dicari lewat namanya maupun nomor
 * HP-nya.
 */
export function ComboboxPilih({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ditemukan.",
  disabled = false,
  className,
  icon,
}: {
  value: string
  onChange: (value: string) => void
  options: PilihanCombobox[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  icon?: React.ReactNode
}) {
  const [terbuka, setTerbuka] = useState(false)
  const terpilih = options.find((o) => o.value === value)

  return (
    <Popover open={terbuka} onOpenChange={setTerbuka}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={terbuka}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {icon}
            <span className={cn("truncate", !terpilih && "text-muted-foreground")}>
              {terpilih?.label ?? placeholder}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // Nilai pencarian memuat hint supaya orang bisa mengetik nomor HP,
                  // bukan cuma nama.
                  value={`${option.label} ${option.hint ?? ""}`}
                  onSelect={() => {
                    onChange(option.value)
                    setTerbuka(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.hint && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.hint}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
