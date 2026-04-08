"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

// Custom icons
const branchIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface AttendanceMapProps {
  branchLocation: {
    lat: number
    lng: number
    name: string
  }
  userLocation: {
    lat: number
    lng: number
  } | null
  radius: number // in meters
}

function MapUpdater({
  branchLocation,
  userLocation,
}: {
  branchLocation: { lat: number; lng: number }
  userLocation: { lat: number; lng: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    if (userLocation) {
      // Fit bounds to show both branch and user
      const bounds = L.latLngBounds(
        [branchLocation.lat, branchLocation.lng],
        [userLocation.lat, userLocation.lng]
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    } else {
      // Center on branch
      map.setView([branchLocation.lat, branchLocation.lng], 15)
    }
  }, [map, branchLocation, userLocation])

  return null
}

export default function AttendanceMap({ branchLocation, userLocation, radius }: AttendanceMapProps) {
  const mapRef = useRef<L.Map | null>(null)

  return (
    <div className="h-[450px] w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={[branchLocation.lat, branchLocation.lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Branch Marker */}
        <Marker position={[branchLocation.lat, branchLocation.lng]} icon={branchIcon}>
          {/* Popup can be added here if needed */}
        </Marker>

        {/* Radius Circle */}
        <Circle
          center={[branchLocation.lat, branchLocation.lng]}
          radius={radius}
          pathOptions={{
            color: "#22c55e",
            fillColor: "#22c55e",
            fillOpacity: 0.2,
            weight: 2,
          }}
        />

        {/* User Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            {/* Popup can be added here if needed */}
          </Marker>
        )}

        <MapUpdater branchLocation={branchLocation} userLocation={userLocation} />
      </MapContainer>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Kantor ({branchLocation.name})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 opacity-50" />
          <span className="text-muted-foreground">Radius {radius / 1000} km</span>
        </div>
        {userLocation && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Lokasi Anda</span>
          </div>
        )}
      </div>
    </div>
  )
}
