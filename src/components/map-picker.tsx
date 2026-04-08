"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

type MapPickerProps = {
  value: string // Google Maps URL or empty
  onChange: (mapsUrl: string, lat?: number, lng?: number) => void
}

function LocationMarker({ position, setPosition }: { position: L.LatLng | null; setPosition: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng)
    },
  })

  return position === null ? null : <Marker position={position} />
}

export function MapPicker({ value, onChange }: MapPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<L.LatLng | null>(null)
  const [mapsUrl, setMapsUrl] = useState(value || "")
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Parse Google Maps URL ke koordinat
  useEffect(() => {
    if (value) {
      const coords = parseGoogleMapsUrl(value)
      if (coords) {
        setPosition(L.latLng(coords.lat, coords.lng))
        setMapsUrl(value)
      }
    }
  }, [value])

  // Update maps URL saat position berubah
  useEffect(() => {
    if (position) {
      const newMapsUrl = generateGoogleMapsUrl(position.lat, position.lng)
      setMapsUrl(newMapsUrl)
      onChange(newMapsUrl, position.lat, position.lng)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position])

  function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
    if (!url) return null

    // Parse format: @-7.9553004,112.5873766
    const match = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) }
    }

    // Parse format: !3d-7.9553057!4d112.5895653
    const match2 = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
    if (match2) {
      return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) }
    }

    return null
  }

  function generateGoogleMapsUrl(lat: number, lng: number): string {
    return `https://www.google.co.id/maps/place/@${lat},${lng},17z`
  }

  function handleManualInput(e: React.ChangeEvent<HTMLInputElement>) {
    const url = e.target.value
    setMapsUrl(url)
    const coords = parseGoogleMapsUrl(url)
    if (coords) {
      setPosition(L.latLng(coords.lat, coords.lng))
      if (mapRef.current) {
        mapRef.current.setView([coords.lat, coords.lng], 17)
      }
    }
  }

  function getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          setPosition(L.latLng(latitude, longitude))
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 17)
          }
        },
        (error) => {

          alert("Tidak dapat mengakses lokasi Anda. Pastikan izin lokasi diaktifkan.")
        }
      )
    } else {
      alert("Geolocation tidak didukung oleh browser Anda.")
    }
  }

  if (!mounted) {
    return (
      <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  const center: [number, number] = position ? [position.lat, position.lng] : [-7.9553004, 112.5873766]

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Paste Google Maps URL atau klik di peta"
          value={mapsUrl}
          onChange={handleManualInput}
          className="flex-1"
        />
        <Button type="button" onClick={getCurrentLocation} variant="outline" size="icon" title="Gunakan Lokasi Saya">
          <MapPin className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-[400px] rounded-lg overflow-hidden border">
        <MapContainer
          center={center}
          zoom={17}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>

      {position && (
        <p className="text-xs text-muted-foreground">
          Koordinat: {position.lat.toFixed(7)}, {position.lng.toFixed(7)}
        </p>
      )}
    </div>
  )
}
