"use client"

import { useAuth } from "@/contexts/auth-context"

/**
 * Kolom "Cabang" hanya berarti saat daftarnya memang bercampur.
 *
 * Pengguna cabang selalu melihat satu cabang saja — kolom yang isinya sama di setiap
 * baris cuma memakan lebar. Yang butuh adalah super admin saat belum memilih cabang
 * mana pun (`active_id` null): daftarnya berisi baris dari semua cabang sekaligus, dan
 * tanpa kolom ini tidak ada cara membedakannya.
 */
export function useKolomCabang(): boolean {
  const { branch } = useAuth()

  return branch?.active_id === null
}
