"use client"

import { useEffect, useRef, useState } from "react"
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
  const [imgError, setImgError] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const trigger = triggerRef.current
    closeRef.current?.focus()

    // Dialog isn't portaled, so trap Tab and hide the rest of the page from
    // screen readers by marking every element outside the dialog's ancestor
    // chain `inert` — the dialog has one focusable element (the close button),
    // so with everything else inert, Tab has nowhere else to go.
    const inerted: HTMLElement[] = []
    let node: HTMLElement | null = dialogRef.current
    while (node && node !== document.body) {
      const parent: HTMLElement | null = node.parentElement
      if (parent) {
        Array.from(parent.children).forEach((sibling) => {
          if (sibling !== node && sibling instanceof HTMLElement && !sibling.hasAttribute("inert")) {
            sibling.setAttribute("inert", "")
            inerted.push(sibling)
          }
        })
      }
      node = parent
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
      inerted.forEach((el) => el.removeAttribute("inert"))
      trigger?.focus()
    }
  }, [open])

  if (!photo || imgError) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-neutral-300 bg-neutral-100">
        <ImageOff className="h-4 w-4 text-neutral-400" />
        <span className="sr-only">Tidak ada foto</span>
      </div>
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Perbesar foto ${name}`}
        className="h-14 w-14 shrink-0 overflow-hidden border border-neutral-300"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </button>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${name}`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            ref={closeRef}
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
