'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

type VehicleLocationRow = {
  id: string
  vehicle_id: string
  lat: number
  lng: number
  recorded_at: string
}

type Vehicle = {
  id: string
  driver_name: string
  plate: string
  vehicle_model: string | null
  status: string
}

type VehicleMarker = {
  vehicle_id: string
  lat: number
  lng: number
  recorded_at: string
  driver_name: string
  plate: string
  vehicle_model: string | null
  status: string
}

export default function MapaPage() {
  const [markers, setMarkers] = useState<VehicleMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [carIcon, setCarIcon] = useState<any>(null)

  async function loadLocations() {
    const [
      { data: locationsData, error: locationsError },
      { data: vehiclesData, error: vehiclesError },
    ] = await Promise.all([
      supabase
        .from('vehicle_locations')
        .select('*')
        .order('recorded_at', { ascending: false }),
      supabase
        .from('vehicles')
        .select('id, driver_name, plate, vehicle_model, status'),
    ])

    if (locationsError) {
      console.error('Error cargando ubicaciones:', locationsError)
      return
    }

    if (vehiclesError) {
      console.error('Error cargando vehículos:', vehiclesError)
      return
    }

    const latestByVehicle: Record<string, VehicleLocationRow> = {}

    ;((locationsData as VehicleLocationRow[]) || []).forEach((row) => {
      if (!latestByVehicle[row.vehicle_id]) {
        latestByVehicle[row.vehicle_id] = row
      }
    })

    const vehicleMap = new Map<string, Vehicle>(
      ((vehiclesData as Vehicle[]) || []).map((v) => [v.id, v])
    )

    const merged: VehicleMarker[] = Object.values(latestByVehicle)
      .map((loc) => {
        const vehicle = vehicleMap.get(loc.vehicle_id)
        if (!vehicle) return null

        return {
          vehicle_id: loc.vehicle_id,
          lat: loc.lat,
          lng: loc.lng,
          recorded_at: loc.recorded_at,
          driver_name: vehicle.driver_name,
          plate: vehicle.plate,
          vehicle_model: vehicle.vehicle_model,
          status: vehicle.status,
        }
      })
      .filter((item): item is VehicleMarker => item !== null)

    setMarkers(merged)
    setLoading(false)
  }

  useEffect(() => {
    setMounted(true)

    async function loadLeafletIcon() {
      const L = await import('leaflet')

      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      setCarIcon(icon)
    }

    loadLeafletIcon()
    loadLocations()

    const interval = setInterval(() => {
      loadLocations()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('vehicle-locations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_locations',
        },
        () => {
          loadLocations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const center = useMemo<[number, number]>(() => {
    if (markers.length > 0) {
      return [markers[0].lat, markers[0].lng]
    }

    return [-33.45, -70.66]
  }, [markers])

  if (!mounted) {
    return (
      <main className="h-screen w-full bg-slate-950 text-white flex items-center justify-center">
        <p>Cargando mapa...</p>
      </main>
    )
  }

  return (
    <main className="h-screen w-full bg-slate-950 text-white">
      <div className="absolute z-[1000] left-4 top-4 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 shadow-lg">
        <h1 className="text-lg font-bold">Mapa operativo</h1>
        <p className="text-sm text-slate-300">
          Vehículos con última ubicación reportada
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {loading ? 'Cargando...' : `${markers.length} vehículo(s) en mapa`}
        </p>
      </div>

      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {carIcon &&
          markers.map((marker) => (
            <Marker
              key={marker.vehicle_id}
              position={[marker.lat, marker.lng]}
              icon={carIcon}
            >
              <Popup>
                <div>
                  <strong>{marker.driver_name}</strong>
                  <br />
                  Patente: {marker.plate}
                  <br />
                  Vehículo: {marker.vehicle_model || 'Sin modelo'}
                  <br />
                  Estado: {marker.status}
                  <br />
                  Lat: {marker.lat.toFixed(5)}
                  <br />
                  Lng: {marker.lng.toFixed(5)}
                  <br />
                  Actualizado: {new Date(marker.recorded_at).toLocaleString()}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </main>
  )
}