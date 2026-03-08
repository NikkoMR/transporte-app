'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
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

type RequestData = {
  id: string
  full_name: string
  pickup_address: string
  destination_address: string
  status: string
  assigned_vehicle_id: string | null
}

type VehicleLocation = {
  lat: number
  lng: number
  recorded_at: string
}

export default function TrackingPage() {
  const params = useParams()
  const requestId = params.id as string

  const [requestData, setRequestData] = useState<RequestData | null>(null)
  const [location, setLocation] = useState<VehicleLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  async function loadTracking() {
    const { data: request, error: requestError } = await supabase
      .from('transport_requests')
      .select('id, full_name, pickup_address, destination_address, status, assigned_vehicle_id')
      .eq('id', requestId)
      .single()

    if (requestError || !request) {
      console.error(requestError)
      setLoading(false)
      return
    }

    setRequestData(request as RequestData)

    if ((request as RequestData).assigned_vehicle_id) {
      const { data: locationData } = await supabase
        .from('vehicle_locations')
        .select('lat, lng, recorded_at')
        .eq('vehicle_id', (request as RequestData).assigned_vehicle_id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single()

      if (locationData) {
        setLocation(locationData as VehicleLocation)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    setMounted(true)
    loadTracking()

    const interval = setInterval(() => {
      loadTracking()
    }, 5000)

    return () => clearInterval(interval)
  }, [requestId])

  const center = useMemo<[number, number]>(() => {
    if (location) return [location.lat, location.lng]
    return [-33.45, -70.66]
  }, [location])

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Cargando seguimiento...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">Seguimiento de tu transporte</h1>

          {loading ? (
            <p className="text-slate-300">Cargando...</p>
          ) : !requestData ? (
            <p className="text-slate-300">No se encontró la solicitud.</p>
          ) : (
            <div className="space-y-2 text-slate-300">
              <p>
                <span className="text-slate-400">Pasajero:</span> {requestData.full_name}
              </p>
              <p>
                <span className="text-slate-400">Recogida:</span> {requestData.pickup_address}
              </p>
              <p>
                <span className="text-slate-400">Destino:</span> {requestData.destination_address}
              </p>
              <p>
                <span className="text-slate-400">Estado:</span> {requestData.status}
              </p>
            </div>
          )}
        </div>

        <div className="h-[500px] rounded-2xl overflow-hidden border border-slate-800">
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {location && (
              <Marker position={[location.lat, location.lng]}>
                <Popup>
                  Tu conductor está aquí.
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>
    </main>
  )
}