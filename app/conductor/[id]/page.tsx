'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Vehicle = {
  id: string
  driver_name: string
  driver_phone: string
  plate: string
  vehicle_model: string | null
  capacity_total: number
  capacity_available: number
  current_zone: string | null
  available_from: string | null
  status: string
  notes: string | null
}

type AssignedRequest = {
  id: string
  full_name: string
  phone: string
  pickup_address: string
  pickup_zone: string | null
  destination_address: string
  passenger_count: number
  status: string
}

export default function ConductorPage() {
  const params = useParams()
  const vehicleId = params.id as string

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [requests, setRequests] = useState<AssignedRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')
  const [trackingActive, setTrackingActive] = useState(false)

  const watchIdRef = useRef<number | null>(null)

  async function loadData() {
    if (!vehicleId) return

    setLoading(true)

    const { data: vehicleData, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single()

    if (vehicleError) {
      console.error('Error vehículo:', vehicleError)
      setMessage('No se pudo cargar el vehículo')
      setLoading(false)
      return
    }

    const { data: requestsData, error: requestsError } = await supabase
      .from('transport_requests')
      .select('*')
      .eq('assigned_vehicle_id', vehicleId)
      .in('status', ['asignado', 'en_camino', 'llego', 'a_bordo'])

    if (requestsError) {
      console.error('Error solicitudes:', requestsError)
    }

    setVehicle(vehicleData as Vehicle)
    setRequests((requestsData as AssignedRequest[]) || [])
    setLoading(false)
  }

  function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      })
    })
  }

  async function saveLocation(lat: number, lng: number) {
    const { error } = await supabase.from('vehicle_locations').insert([
      {
        vehicle_id: vehicleId,
        lat,
        lng,
      },
    ])

    if (error) {
      console.error('Error guardando ubicación:', error)
      return false
    }

    return true
  }

  async function shareLocationOnce() {
    if (!vehicleId) return

    setSharing(true)
    setMessage('')

    try {
      const position = await getCurrentPosition()
      const lat = position.coords.latitude
      const lng = position.coords.longitude

      const ok = await saveLocation(lat, lng)

      if (ok) {
        setMessage('Ubicación enviada correctamente')
      } else {
        setMessage('No se pudo guardar la ubicación')
      }
    } catch (error) {
      console.error(error)
      setMessage('No se pudo obtener tu ubicación')
    }

    setSharing(false)
  }

  function startTracking() {
    if (!vehicleId) return

    if (!navigator.geolocation) {
      setMessage('Este dispositivo no soporta geolocalización')
      return
    }

    if (watchIdRef.current !== null) {
      setMessage('El seguimiento ya está activo')
      return
    }

    setTrackingActive(true)
    setMessage('Activando seguimiento...')

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        const ok = await saveLocation(lat, lng)

        if (ok) {
          setMessage(
            `Seguimiento activo. Última ubicación enviada: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
          )
        } else {
          setMessage('Error enviando ubicación durante el seguimiento')
        }
      },
      (error) => {
        console.error('Error GPS:', error)
        setTrackingActive(false)
        setMessage('No se pudo iniciar el seguimiento de ubicación')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )

    watchIdRef.current = watchId
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setTrackingActive(false)
    setMessage('Seguimiento detenido')
  }

  useEffect(() => {
    loadData()
  }, [vehicleId])

  useEffect(() => {
    if (!vehicleId) return

    startTracking()

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [vehicleId])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <div className="max-w-3xl mx-auto">Cargando...</div>
      </main>
    )
  }

  if (!vehicle) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <div className="max-w-3xl mx-auto">Vehículo no encontrado.</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">Panel del conductor</h1>
          <p className="text-slate-300">
            Aquí puedes ver tus viajes asignados y compartir tu ubicación.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Datos del vehículo</h2>

          <div className="space-y-2 text-slate-300">
            <p>
              <span className="text-slate-400">Conductor:</span> {vehicle.driver_name}
            </p>
            <p>
              <span className="text-slate-400">Teléfono:</span> {vehicle.driver_phone}
            </p>
            <p>
              <span className="text-slate-400">Patente:</span> {vehicle.plate}
            </p>
            <p>
              <span className="text-slate-400">Vehículo:</span> {vehicle.vehicle_model || 'Sin modelo'}
            </p>
            <p>
              <span className="text-slate-400">Cupos disponibles:</span> {vehicle.capacity_available}
            </p>
            <p>
              <span className="text-slate-400">Seguimiento:</span> {trackingActive ? 'Activo' : 'Detenido'}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <button
              onClick={shareLocationOnce}
              disabled={sharing}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-3 font-semibold disabled:opacity-60"
            >
              {sharing ? 'Enviando ubicación...' : 'Enviar ubicación una vez'}
            </button>

            {!trackingActive ? (
              <button
                onClick={startTracking}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-3 font-semibold"
              >
                Iniciar seguimiento automático
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="w-full rounded-lg bg-red-600 hover:bg-red-500 px-4 py-3 font-semibold"
              >
                Detener seguimiento
              </button>
            )}
          </div>

          {message && (
            <p className="mt-3 text-sm text-slate-300">{message}</p>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Viajes asignados</h2>

          {requests.length === 0 ? (
            <p className="text-slate-400">No tienes viajes activos.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <p className="font-semibold text-lg">{request.full_name}</p>
                  <p className="text-slate-300">{request.phone}</p>

                  <div className="mt-3 space-y-1 text-sm text-slate-300">
                    <p>
                      <span className="text-slate-400">Recogida:</span> {request.pickup_address}
                    </p>
                    <p>
                      <span className="text-slate-400">Zona:</span> {request.pickup_zone || 'Sin zona'}
                    </p>
                    <p>
                      <span className="text-slate-400">Destino:</span> {request.destination_address}
                    </p>
                    <p>
                      <span className="text-slate-400">Pasajeros:</span> {request.passenger_count}
                    </p>
                    <p>
                      <span className="text-slate-400">Estado:</span> {request.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}