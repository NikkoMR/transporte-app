'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Vehicle = {
  id: string
  driver_name: string
  plate: string
  vehicle_model: string | null
}

type RequestItem = {
  id: string
  full_name: string
  phone: string
  pickup_address: string
  destination_address: string
  passenger_count: number
  status: string
}

export default function ChoferPage() {
  const params = useParams()
  const vehicleId = params.id as string

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function loadData() {
    setLoading(true)

    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('id, driver_name, plate, vehicle_model')
      .eq('id', vehicleId)
      .single()

    const { data: requestsData } = await supabase
      .from('transport_requests')
      .select(
        'id, full_name, phone, pickup_address, destination_address, passenger_count, status'
      )
      .eq('assigned_vehicle_id', vehicleId)
      .in('status', ['asignado', 'en_camino', 'llego'])

    setVehicle((vehicleData as Vehicle) || null)
    setRequests((requestsData as RequestItem[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (vehicleId) loadData()
  }, [vehicleId])

  async function updateStatus(requestId: string, status: string) {
    setMessage('')

    const { error } = await supabase
      .from('transport_requests')
      .update({ status })
      .eq('id', requestId)

    if (error) {
      console.error(error)
      setMessage('Error actualizando estado')
      return
    }

    setMessage('Estado actualizado')
    await loadData()
  }

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
        <div className="max-w-3xl mx-auto">Chofer no encontrado.</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">Panel del chofer</h1>
          <p className="text-slate-300">
            {vehicle.driver_name} — {vehicle.plate}
          </p>
          <p className="text-slate-400">
            {vehicle.vehicle_model || 'Vehículo no informado'}
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400">
            No tienes viajes activos.
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"
            >
              <div>
                <h2 className="text-xl font-semibold">{request.full_name}</h2>
                <p className="text-slate-300">{request.phone}</p>
              </div>

              <div className="text-sm text-slate-300 space-y-1">
                <p>
                  <span className="text-slate-400">Recogida:</span>{' '}
                  {request.pickup_address}
                </p>
                <p>
                  <span className="text-slate-400">Destino:</span>{' '}
                  {request.destination_address}
                </p>
                <p>
                  <span className="text-slate-400">Pasajeros:</span>{' '}
                  {request.passenger_count}
                </p>
                <p>
                  <span className="text-slate-400">Estado:</span>{' '}
                  {request.status}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap pt-2">
                {request.status === 'asignado' && (
                  <button
                    onClick={() => updateStatus(request.id, 'en_camino')}
                    className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 font-semibold"
                  >
                    En camino
                  </button>
                )}

                {request.status === 'en_camino' && (
                  <button
                    onClick={() => updateStatus(request.id, 'llego')}
                    className="rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 font-semibold"
                  >
                    Llegué
                  </button>
                )}

                {request.status === 'llego' && (
                  <button
                    onClick={() => updateStatus(request.id, 'completado')}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-semibold"
                  >
                    Finalizar viaje
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {message && <p className="text-sm text-slate-300">{message}</p>}
      </div>
    </main>
  )
}