'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type TransportRequest = {
  id: string
  full_name: string
  phone: string
  pickup_address: string
  pickup_zone: string | null
  destination_address: string
  trip_date: string
  requested_time: string
  passenger_count: number
  notes: string | null
  status: string
  assigned_vehicle_id?: string | null
  assigned_at?: string | null
  picked_up_at?: string | null
  completed_at?: string | null
}

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

function normalizeZone(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function getRecommendedVehicles(
  request: TransportRequest,
  vehicles: Vehicle[]
): Vehicle[] {
  const requestZone = normalizeZone(request.pickup_zone)

  const validVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === 'disponible' &&
      vehicle.capacity_available >= request.passenger_count
  )

  return validVehicles.sort((a, b) => {
    const aSameZone = normalizeZone(a.current_zone) === requestZone ? 1 : 0
    const bSameZone = normalizeZone(b.current_zone) === requestZone ? 1 : 0

    if (aSameZone !== bSameZone) {
      return bSameZone - aSameZone
    }

    return b.capacity_available - a.capacity_available
  })
}

export default function OperacionPage() {
  const [requests, setRequests] = useState<TransportRequest[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)

    const [
      { data: requestsData, error: requestsError },
      { data: vehiclesData, error: vehiclesError },
    ] = await Promise.all([
      supabase
        .from('transport_requests')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false }),
    ])

    if (requestsError) {
      console.error('Error cargando solicitudes:', requestsError)
    }

    if (vehiclesError) {
      console.error('Error cargando vehículos:', vehiclesError)
    }

    setRequests((requestsData as TransportRequest[]) || [])
    setVehicles((vehiclesData as Vehicle[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function assignVehicle(
    requestId: string,
    vehicle: Vehicle,
    passengers: number
  ) {
    if (vehicle.capacity_available < passengers) {
      alert('Ese vehículo ya no tiene cupos suficientes.')
      return
    }

    setAssigningId(`${requestId}-${vehicle.id}`)

    const newCapacity = vehicle.capacity_available - passengers
    const newStatus = newCapacity === 0 ? 'completo' : 'disponible'

    const { error: requestError } = await supabase
      .from('transport_requests')
      .update({
        status: 'asignado',
        assigned_vehicle_id: vehicle.id,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (requestError) {
      console.error('Error asignando solicitud:', requestError)
      alert('No se pudo asignar la solicitud.')
      setAssigningId(null)
      return
    }

    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({
        capacity_available: newCapacity,
        status: newStatus,
      })
      .eq('id', vehicle.id)

    if (vehicleError) {
      console.error('Error actualizando vehículo:', vehicleError)
      alert('La solicitud se asignó, pero falló la actualización del vehículo.')
      setAssigningId(null)
      await loadData()
      return
    }

    await supabase.from('trip_events').insert([
      {
        request_id: requestId,
        vehicle_id: vehicle.id,
        event_type: 'asignado',
        event_note: `Solicitud asignada a ${vehicle.driver_name} (${vehicle.plate})`,
      },
    ])

    setAssigningId(null)
    await loadData()
  }

  async function updateTripStatus(
    request: TransportRequest,
    nextStatus: string
  ) {
    const updateData: Record<string, string> = {
      status: nextStatus,
    }

    if (nextStatus === 'a_bordo') {
      updateData.picked_up_at = new Date().toISOString()
    }

    if (nextStatus === 'completado') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('transport_requests')
      .update(updateData)
      .eq('id', request.id)

    if (error) {
      console.error('Error actualizando estado:', error)
      alert('No se pudo actualizar el estado.')
      return
    }

    await supabase.from('trip_events').insert([
      {
        request_id: request.id,
        vehicle_id: request.assigned_vehicle_id || null,
        event_type: nextStatus,
        event_note: `Cambio de estado a ${nextStatus}`,
      },
    ])

    await loadData()
  }

  function openWhatsAppForRequest(
    request: TransportRequest,
    vehicle?: Vehicle
  ) {
    const phone = request.phone.replace(/\D/g, '')

    const driverName = vehicle?.driver_name || 'Tu conductor'
    const plate = vehicle?.plate || 'Patente no informada'
    const vehicleModel = vehicle?.vehicle_model || 'Vehículo no informado'

    const message =
      `Hola ${request.full_name}, tu transporte ya fue asignado 🚗\n\n` +
      `Conductor: ${driverName}\n` +
      `Vehículo: ${vehicleModel}\n` +
      `Patente: ${plate}\n` +
      `Recogida: ${request.pickup_address}\n` +
      `Destino: ${request.destination_address}\n\n` +
      `Pronto irá en camino.`

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const activeRequests = requests.filter((request) =>
    ['pendiente', 'asignado', 'en_camino', 'llego', 'a_bordo'].includes(
      request.status
    )
  )

  const availableVehicles = vehicles.filter(
    (vehicle) => vehicle.status === 'disponible'
  )

  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Panel operativo</h1>
        <p className="text-slate-300 mb-8">
          Vista general de solicitudes activas y vehículos disponibles.
        </p>

        {loading ? (
          <div className="text-slate-300">Cargando datos...</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Solicitudes activas</h2>
                <span className="text-sm bg-yellow-600/20 text-yellow-300 px-3 py-1 rounded-full">
                  {activeRequests.length} activas
                </span>
              </div>

              <div className="space-y-4">
                {activeRequests.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-400">
                    No hay solicitudes activas.
                  </div>
                ) : (
                  activeRequests.map((request) => {
                    const recommendedVehicles = getRecommendedVehicles(
                      request,
                      availableVehicles
                    )

                    const assignedVehicle = request.assigned_vehicle_id
                      ? vehicleById.get(request.assigned_vehicle_id)
                      : undefined

                    return (
                      <div
                        key={request.id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {request.full_name}
                            </h3>
                            <p className="text-slate-300">{request.phone}</p>
                          </div>

                          <span className="text-xs bg-yellow-600/20 text-yellow-300 px-3 py-1 rounded-full">
                            {request.status}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-slate-300">
                          <p>
                            <span className="text-slate-400">Recogida:</span>{' '}
                            {request.pickup_address}
                          </p>
                          <p>
                            <span className="text-slate-400">Zona:</span>{' '}
                            {request.pickup_zone || 'Sin zona'}
                          </p>
                          <p>
                            <span className="text-slate-400">Destino:</span>{' '}
                            {request.destination_address}
                          </p>
                          <p>
                            <span className="text-slate-400">Fecha:</span>{' '}
                            {request.trip_date}
                          </p>
                          <p>
                            <span className="text-slate-400">Hora:</span>{' '}
                            {request.requested_time}
                          </p>
                          <p>
                            <span className="text-slate-400">Pasajeros:</span>{' '}
                            {request.passenger_count}
                          </p>
                          <p>
                            <span className="text-slate-400">Observaciones:</span>{' '}
                            {request.notes || 'Sin observaciones'}
                          </p>

                          {assignedVehicle && (
                            <p>
                              <span className="text-slate-400">
                                Vehículo asignado:
                              </span>{' '}
                              {assignedVehicle.driver_name} — {assignedVehicle.plate}
                            </p>
                          )}
                        </div>

                        {request.status !== 'pendiente' && (
                          <div className="mt-4">
                            <button
                              onClick={() =>
                                openWhatsAppForRequest(request, assignedVehicle)
                              }
                              className="rounded-lg bg-green-700 hover:bg-green-600 px-3 py-2 text-sm font-semibold"
                            >
                              Avisar por WhatsApp
                            </button>
                          </div>
                        )}

                        {request.status === 'asignado' && (
                          <div className="mt-4 flex gap-2 flex-wrap">
                            <button
                              onClick={() =>
                                updateTripStatus(request, 'en_camino')
                              }
                              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-semibold"
                            >
                              Marcar en camino
                            </button>
                          </div>
                        )}

                        {request.status === 'en_camino' && (
                          <div className="mt-4 flex gap-2 flex-wrap">
                            <button
                              onClick={() => updateTripStatus(request, 'llego')}
                              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-sm font-semibold"
                            >
                              Marcar llegó
                            </button>
                          </div>
                        )}

                        {request.status === 'llego' && (
                          <div className="mt-4 flex gap-2 flex-wrap">
                            <button
                              onClick={() =>
                                updateTripStatus(request, 'a_bordo')
                              }
                              className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-2 text-sm font-semibold"
                            >
                              Marcar pasajero a bordo
                            </button>
                          </div>
                        )}

                        {request.status === 'a_bordo' && (
                          <div className="mt-4 flex gap-2 flex-wrap">
                            <button
                              onClick={() =>
                                updateTripStatus(request, 'completado')
                              }
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold"
                            >
                              Marcar viaje completado
                            </button>
                          </div>
                        )}

                        {request.status === 'pendiente' && (
                          <div className="mt-5 border-t border-slate-800 pt-4">
                            <h4 className="text-sm font-semibold text-slate-200 mb-3">
                              Vehículos recomendados por zona y cupos
                            </h4>

                            {recommendedVehicles.length === 0 ? (
                              <div className="rounded-xl bg-red-600/10 border border-red-500/20 p-3 text-sm text-red-300">
                                No hay vehículos disponibles con cupos suficientes
                                para esta solicitud.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {recommendedVehicles.map((vehicle, index) => {
                                  const sameZone =
                                    normalizeZone(vehicle.current_zone) ===
                                    normalizeZone(request.pickup_zone)

                                  const currentAssigning =
                                    assigningId === `${request.id}-${vehicle.id}`

                                  return (
                                    <div
                                      key={vehicle.id}
                                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <p className="font-medium">
                                            #{index + 1} {vehicle.driver_name} —{' '}
                                            {vehicle.plate}
                                          </p>
                                          <p className="text-sm text-slate-400">
                                            {vehicle.vehicle_model || 'Sin modelo'}
                                          </p>
                                        </div>

                                        <div className="flex gap-2 flex-wrap justify-end">
                                          {sameZone && (
                                            <span className="text-xs bg-green-600/20 text-green-300 px-3 py-1 rounded-full">
                                              Misma zona
                                            </span>
                                          )}
                                          <span className="text-xs bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full">
                                            {vehicle.capacity_available} cupos
                                          </span>
                                        </div>
                                      </div>

                                      <div className="mt-3 text-sm text-slate-300 space-y-1">
                                        <p>
                                          <span className="text-slate-400">
                                            Zona actual:
                                          </span>{' '}
                                          {vehicle.current_zone || 'Sin zona'}
                                        </p>
                                        <p>
                                          <span className="text-slate-400">
                                            Teléfono:
                                          </span>{' '}
                                          {vehicle.driver_phone}
                                        </p>
                                        <p>
                                          <span className="text-slate-400">
                                            Disponible desde:
                                          </span>{' '}
                                          {vehicle.available_from || 'No informado'}
                                        </p>
                                      </div>

                                      <button
                                        onClick={() =>
                                          assignVehicle(
                                            request.id,
                                            vehicle,
                                            request.passenger_count
                                          )
                                        }
                                        disabled={currentAssigning}
                                        className="mt-3 w-full rounded-lg bg-green-600 hover:bg-green-500 px-3 py-2 text-sm font-semibold disabled:opacity-60"
                                      >
                                        {currentAssigning
                                          ? 'Asignando...'
                                          : 'Asignar vehículo'}
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Vehículos disponibles</h2>
                <span className="text-sm bg-green-600/20 text-green-300 px-3 py-1 rounded-full">
                  {availableVehicles.length} disponibles
                </span>
              </div>

              <div className="space-y-4">
                {availableVehicles.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-400">
                    No hay vehículos disponibles.
                  </div>
                ) : (
                  availableVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {vehicle.driver_name}
                          </h3>
                          <p className="text-slate-300">{vehicle.driver_phone}</p>
                        </div>

                        <span className="text-xs bg-green-600/20 text-green-300 px-3 py-1 rounded-full">
                          {vehicle.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-slate-300">
                        <p>
                          <span className="text-slate-400">Patente:</span>{' '}
                          {vehicle.plate}
                        </p>
                        <p>
                          <span className="text-slate-400">Vehículo:</span>{' '}
                          {vehicle.vehicle_model || 'Sin modelo'}
                        </p>
                        <p>
                          <span className="text-slate-400">Zona actual:</span>{' '}
                          {vehicle.current_zone || 'Sin zona'}
                        </p>
                        <p>
                          <span className="text-slate-400">Disponible desde:</span>{' '}
                          {vehicle.available_from || 'No informado'}
                        </p>
                        <p>
                          <span className="text-slate-400">Capacidad total:</span>{' '}
                          {vehicle.capacity_total}
                        </p>
                        <p>
                          <span className="text-slate-400">Cupos disponibles:</span>{' '}
                          {vehicle.capacity_available}
                        </p>
                        <p>
                          <span className="text-slate-400">Observaciones:</span>{' '}
                          {vehicle.notes || 'Sin observaciones'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}