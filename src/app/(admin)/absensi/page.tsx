"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ClipboardCheck, Clock, LogIn, LogOut, MapPin, Calendar, AlertCircle, Navigation } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

// Dynamic import for map to avoid SSR issues
const AttendanceMap = dynamic(() => import("@/components/attendance-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Memuat peta...</p>
    </div>
  ),
})

interface AttendanceStatus {
  clock_in: { id: number; time: number; is_wfa: number } | null
  clock_out: { id: number; time: number; is_wfa: number } | null
}

interface AttendanceHistory {
  date: string
  user_name: string
  clock_in: { time: number; is_wfa: number } | null
  clock_out: { time: number; is_wfa: number } | null
  duration: number | null
}

interface BranchLocation {
  latitude: number
  longitude: number
  name: string
}

interface Holiday {
  id: number
  date: number
  name: string
  description: string | null
}

export default function AbsensiPage() {
  const [loading, setLoading] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [status, setStatus] = useState<AttendanceStatus | null>(null)
  const [history, setHistory] = useState<AttendanceHistory[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [branchLocation, setBranchLocation] = useState<BranchLocation | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [todayHoliday, setTodayHoliday] = useState<Holiday | null>(null)

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch today's status
  useEffect(() => {
    fetchTodayStatus()
    fetchHistory()
    fetchBranchLocation()
    fetchTodayHoliday()
  }, [])

  const fetchBranchLocation = async () => {
    try {
      const token = localStorage.getItem("sf_token")
      const user = JSON.parse(localStorage.getItem("sf_user") || "{}")
      const projectId = user.projects_id || 1

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed to fetch branch location")
      const result = await response.json()
      const branch = result.data

      if (branch && branch.latitude && branch.longitude) {
        setBranchLocation({
          latitude: branch.latitude,
          longitude: branch.longitude,
          name: branch.name,
        })
      }
    } catch (error: any) {
      console.error("Error fetching branch location:", error)
    }
  }

  const fetchTodayHoliday = async () => {
    try {
      const token = localStorage.getItem("sf_token")
      const today = format(new Date(), "yyyy-MM-dd")

      const params = new URLSearchParams({
        start_date: today,
        end_date: today,
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/holidays?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      if (data.data && data.data.length > 0) {
        setTodayHoliday(data.data[0])
      }
    } catch (error: any) {
      console.error("Error fetching holiday:", error)
    }
  }

  // Calculate distance when user location changes
  useEffect(() => {
    if (userLocation && branchLocation) {
      const dist = calculateDistance(
        branchLocation.latitude,
        branchLocation.longitude,
        userLocation.lat,
        userLocation.lng
      )
      setDistance(dist)
    }
  }, [userLocation, branchLocation])

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000 // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in meters
  }

  const fetchTodayStatus = async () => {
    try {
      const token = localStorage.getItem("sf_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendances/today`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setStatus(data)
    } catch (error: any) {
      console.error(error)
    }
  }

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("sf_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendances`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setHistory(data.data || [])
    } catch (error: any) {
      console.error(error)
    }
  }

  const getUserLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Browser Anda tidak mendukung GPS/Geolocation"))
        return
      }

      setGettingLocation(true)
      setLocationError(null)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setUserLocation(location)
          setGettingLocation(false)
          resolve(location)
        },
        (error) => {
          setGettingLocation(false)
          let errorMessage = "Gagal mendapatkan lokasi Anda"

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Izin akses lokasi ditolak. Harap izinkan akses lokasi di pengaturan browser Anda."
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Informasi lokasi tidak tersedia. Pastikan GPS aktif dan sinyal bagus."
              break
            case error.TIMEOUT:
              errorMessage = "Waktu permintaan lokasi habis. Coba lagi."
              break
          }

          setLocationError(errorMessage)
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }

  const handleClockIn = async () => {
    // Check if today is Sunday or holiday
    const today = new Date()
    if (today.getDay() === 0) {
      toast.error("Tidak dapat absen di hari Minggu")
      return
    }

    if (todayHoliday) {
      toast.error(`Tidak dapat absen di hari libur: ${todayHoliday.name}`)
      return
    }

    setLoading(true)
    try {
      // Get user location first
      const location = await getUserLocation()

      const token = localStorage.getItem("sf_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendances/clock-in`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          is_wfa: 0,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Show detailed error message
        if (data.distance && data.max_distance) {
          const distanceKm = (data.distance / 1000).toFixed(2)
          const maxDistanceKm = (data.max_distance / 1000).toFixed(2)
          toast.error(
            `${data.message}\n\nJarak Anda: ${distanceKm} km\nRadius maksimal: ${maxDistanceKm} km`,
            { duration: 5000 }
          )
        } else {
          toast.error(data.message || "Gagal absen masuk")
        }
        return
      }

      const distanceM = data.distance
      const distanceKm = (distanceM / 1000).toFixed(2)
      toast.success(
        `Berhasil absen masuk!\nJarak dari kantor: ${distanceKm} km`,
        { duration: 3000 }
      )

      await fetchTodayStatus()
      await fetchHistory()
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat absen masuk")
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    // Check if today is Sunday or holiday
    const today = new Date()
    if (today.getDay() === 0) {
      toast.error("Tidak dapat absen di hari Minggu")
      return
    }

    if (todayHoliday) {
      toast.error(`Tidak dapat absen di hari libur: ${todayHoliday.name}`)
      return
    }

    setLoading(true)
    try {
      // Get user location first
      const location = await getUserLocation()

      const token = localStorage.getItem("sf_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendances/clock-out`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          is_wfa: 0,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Show detailed error message
        if (data.distance && data.max_distance) {
          const distanceKm = (data.distance / 1000).toFixed(2)
          const maxDistanceKm = (data.max_distance / 1000).toFixed(2)
          toast.error(
            `${data.message}\n\nJarak Anda: ${distanceKm} km\nRadius maksimal: ${maxDistanceKm} km`,
            { duration: 5000 }
          )
        } else {
          toast.error(data.message || "Gagal absen pulang")
        }
        return
      }

      const distanceM = data.distance
      const distanceKm = (distanceM / 1000).toFixed(2)
      toast.success(
        `Berhasil absen pulang!\nJarak dari kantor: ${distanceKm} km`,
        { duration: 3000 }
      )

      await fetchTodayStatus()
      await fetchHistory()
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat absen pulang")
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours} jam ${minutes} menit`
  }

  const canClockIn = !status?.clock_in
  const canClockOut = status?.clock_in && !status?.clock_out

  const isSunday = new Date().getDay() === 0

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Absensi Karyawan</h1>
        <p className="text-muted-foreground">Kelola absensi masuk dan pulang</p>
      </div>

      {/* Holiday Alert */}
      {(todayHoliday || isSunday) && (
        <Alert className="border-red-300 bg-red-50">
          <Calendar className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Hari Libur:</strong>{" "}
            {todayHoliday ? todayHoliday.name : "Hari Minggu"}
            {todayHoliday?.description && ` - ${todayHoliday.description}`}
            <br />
            <span className="text-sm">Tidak dapat melakukan absensi di hari libur</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Map */}
      {branchLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Peta Lokasi Absensi
            </CardTitle>
            <CardDescription>
              Lingkaran hijau menunjukkan radius 1 km dari kantor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceMap
              branchLocation={{
                lat: branchLocation.latitude,
                lng: branchLocation.longitude,
                name: branchLocation.name,
              }}
              userLocation={userLocation}
              radius={1000} // 1 km in meters
            />
          </CardContent>
        </Card>
      )}

      {/* Clock In/Out Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-green-600" />
              Clock In
            </CardTitle>
            <CardDescription>Absen masuk hari ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{format(currentTime, "HH:mm:ss")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Kantor</span>
            </div>
            {status?.clock_in ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">Sudah Absen Masuk</p>
                <p className="text-xs text-green-700 mt-1">
                  {format(new Date(status.clock_in.time * 1000), "HH:mm:ss")}
                </p>
              </div>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={handleClockIn}
                disabled={loading || gettingLocation || !canClockIn}
              >
                {gettingLocation ? (
                  <>
                    <Navigation className="h-4 w-4 mr-2 animate-pulse" />
                    Mengambil Lokasi...
                  </>
                ) : loading ? (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Absen Masuk
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              Clock Out
            </CardTitle>
            <CardDescription>Absen pulang hari ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{format(currentTime, "HH:mm:ss")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Kantor</span>
            </div>
            {status?.clock_out ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900">Sudah Absen Pulang</p>
                <p className="text-xs text-red-700 mt-1">
                  {format(new Date(status.clock_out.time * 1000), "HH:mm:ss")}
                </p>
              </div>
            ) : (
              <Button
                className="w-full"
                size="lg"
                variant="destructive"
                onClick={handleClockOut}
                disabled={loading || gettingLocation || !canClockOut}
              >
                {gettingLocation ? (
                  <>
                    <Navigation className="h-4 w-4 mr-2 animate-pulse" />
                    Mengambil Lokasi...
                  </>
                ) : loading ? (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Absen Pulang
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Hari Ini */}
      {(status?.clock_in || status?.clock_out) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Status Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Masuk</p>
                <p className="text-lg font-semibold">
                  {status.clock_in ? format(new Date(status.clock_in.time * 1000), "HH:mm") : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pulang</p>
                <p className="text-lg font-semibold">
                  {status.clock_out ? format(new Date(status.clock_out.time * 1000), "HH:mm") : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Durasi</p>
                <p className="text-lg font-semibold">
                  {status.clock_in && status.clock_out
                    ? formatDuration(status.clock_out.time - status.clock_in.time)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={status.clock_out ? "default" : "secondary"}>
                  {status.clock_out ? "Selesai" : "Sedang Bekerja"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riwayat Absensi */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Absensi</CardTitle>
          <CardDescription>7 hari terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada riwayat absensi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(item.date), "EEEE, dd MMMM yyyy", { locale: idLocale })}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.user_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground">Masuk</p>
                      <p className="font-medium">
                        {item.clock_in ? format(new Date(item.clock_in.time * 1000), "HH:mm") : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pulang</p>
                      <p className="font-medium">
                        {item.clock_out ? format(new Date(item.clock_out.time * 1000), "HH:mm") : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Durasi</p>
                      <p className="font-medium">
                        {item.duration ? formatDuration(item.duration) : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
