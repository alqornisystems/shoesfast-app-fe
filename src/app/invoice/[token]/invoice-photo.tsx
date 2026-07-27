"use client"

import { useEffect, useState } from "react"
import { ImageOff, X } from "lucide-react"

/**
 * Foto satu item invoice, dengan lightbox layar penuh saat diklik.
 *
 * Ini satu-satunya berkas "use client" di halaman invoice publik.
 *
 * TITIK SAMBUNG SPEC LANJUTAN: saat spec "putaran 360 derajat" dikerjakan, cukup isi
 * komponen ini yang ditukar dengan viewer spin — page.tsx dan sisa halaman invoice tidak
 * perlu disentuh. Versi ini SENGAJA hanya lightbox; 360 tidak termasuk lingkup spec ini.
 */
export function InvoicePhoto({ photo, name }: { photo: string | null; name: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open])

  if (!photo) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border bg-muted sm:h-28 sm:w-28">
        <ImageOff className="h-6 w-6 text-muted-foreground/60" />
        <span className="sr-only">Tidak ada foto</span>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Klik untuk memperbesar"
        className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border sm:h-28 sm:w-28"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={name} className="h-full w-full object-cover" loading="lazy" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${name}`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup foto"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={name} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  )
}
