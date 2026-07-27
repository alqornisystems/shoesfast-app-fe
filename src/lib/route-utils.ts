/**
 * Menyusun rute antar/jemput lalu membukanya di Google Maps.
 *
 * Sengaja tanpa API berbayar. Google Maps TIDAK mengurutkan waypoint lewat tautan biasa —
 * urutannya dipakai persis seperti yang kita kirim — jadi pengurutannya dihitung di sini
 * dengan tetangga-terdekat. Hasilnya rute yang masuk akal, bukan optimal: tetangga-terdekat
 * biasanya meleset 10-25% dari rute terbaik. Optimasi sungguhan butuh Directions API
 * berbayar dengan optimize:true.
 */

export type Titik = {
  id: number
  label: string
  lat: number
  lng: number
}

/** Batas skema tautan Google Maps: 1 asal + 1 tujuan + 9 singgahan. */
export const MAKS_TITIK = 10

/**
 * Ambil koordinat dari tautan Google Maps yang tersimpan di customers.maps.
 *
 * Bentuk `!3d<lat>!4d<lng>` adalah koordinat TEMPATNYA dan itu yang dipakai. Angka setelah
 * `@` hanya titik tengah tampilan peta saat tautan dibuat — bisa meleset puluhan meter, jadi
 * hanya dipakai kalau bentuk pertama tidak ada.
 */
export function bacaKoordinat(maps: string | null | undefined): { lat: number; lng: number } | null {
  if (!maps) return null

  const tempat = maps.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
  if (tempat) {
    return { lat: parseFloat(tempat[1]), lng: parseFloat(tempat[2]) }
  }

  const tampilan = maps.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (tampilan) {
    return { lat: parseFloat(tampilan[1]), lng: parseFloat(tampilan[2]) }
  }

  return null
}

/** Jarak garis lurus dalam meter (Haversine). Cukup untuk membandingkan mana yang lebih dekat. */
export function jarakMeter(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Urutkan titik: dari posisi awal ambil yang terdekat, lalu dari titik itu cari terdekat
 * berikutnya, begitu seterusnya.
 */
export function urutkanTerdekat(awal: { lat: number; lng: number }, titik: Titik[]): Titik[] {
  const sisa = [...titik]
  const hasil: Titik[] = []
  let posisi = awal

  while (sisa.length > 0) {
    let terdekat = 0
    let terpendek = jarakMeter(posisi, sisa[0])

    for (let i = 1; i < sisa.length; i++) {
      const d = jarakMeter(posisi, sisa[i])
      if (d < terpendek) {
        terpendek = d
        terdekat = i
      }
    }

    const dipilih = sisa.splice(terdekat, 1)[0]
    hasil.push(dipilih)
    posisi = dipilih
  }

  return hasil
}

/**
 * Rakit tautan Google Maps. Titik terakhir jadi tujuan, sisanya jadi singgahan sesuai urutan.
 */
export function tautanRute(awal: { lat: number; lng: number }, urutan: Titik[]): string {
  const koordinat = (t: { lat: number; lng: number }) => `${t.lat},${t.lng}`
  const tujuan = urutan[urutan.length - 1]
  const singgah = urutan.slice(0, -1)

  const params = new URLSearchParams({
    api: "1",
    origin: koordinat(awal),
    destination: koordinat(tujuan),
    travelmode: "driving",
  })

  if (singgah.length > 0) {
    // URLSearchParams meng-encode "|" jadi %7C, dan Google menerimanya.
    params.set("waypoints", singgah.map(koordinat).join("|"))
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Posisi kurir sekarang, lewat browser. Gratis, tanpa API. */
export function posisiSekarang(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Perangkat ini tidak mendukung deteksi lokasi."))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Lokasi tidak bisa dibaca. Izinkan akses lokasi lalu coba lagi.")),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })
}
