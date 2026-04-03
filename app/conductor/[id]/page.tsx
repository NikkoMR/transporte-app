import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

type Vehicle = {
  id: string
  driver_name: string
  driver_phone: string
  plate: string
  vehicle_model: string | null
  current_zone: string | null
  capacity_total: number
  capacity_available: number
  status: string
}

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
  assigned_vehicle_id: string | null
  assigned_at: string | null
}

const ZONE_PRIORITY: Record<string, number> = {
  PROVIDENCIA: 1,
  ÑUÑOA: 2,
  SANTIAGO: 3,
  LAS_CONDES: 4,
  VITACURA: 5,
  LO_BARNECHEA: 6,
  LA_REINA: 7,
  MACUL: 8,
  SAN_MIGUEL: 9,
  LA_FLORIDA: 10,
  ESTACION_CENTRAL: 11,
  RECOLETA: 12,
  INDEPENDENCIA: 13,
  QUILICURA: 14,
  MAIPU: 15,
  PUENTE_ALTO: 16,
}

function normalizeZone(value: string | null | undefined) {
  return (value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

function getZonePriority(zone: string | null | undefined) {
  const normalized = normalizeZone(zone)
  return ZONE_PRIORITY[normalized] ?? 999
}

function sortSuggestedRoute(
  requests: TransportRequest[],
  vehicleZone: string | null | undefined
) {
  const originPriority = getZonePriority(vehicleZone)

  return [...requests].sort((a, b) => {
    const aZone = getZonePriority(a.pickup_zone)
    const bZone = getZonePriority(b.pickup_zone)

    const aDistance = Math.abs(aZone - originPriority)
    const bDistance = Math.abs(bZone - originPriority)

    if (aDistance !== bDistance) return aDistance - bDistance

    if (a.requested_time !== b.requested_time) {
      return a.requested_time.localeCompare(b.requested_time)
    }

    return a.full_name.localeCompare(b.full_name)
  })
}

export default async function ConductorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single()

  if (vehicleError || !vehicle) {
    notFound()
  }

  const { data: requests, error: requestsError } = await supabase
    .from('transport_requests')
    .select('*')
    .eq('assigned_vehicle_id', id)
    .in('status', ['asignado', 'en_camino'])
    .order('trip_date', { ascending: true })
    .order('requested_time', { ascending: true })

  if (requestsError) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Panel del conductor</h1>
          <p className="text-red-400">Error cargando solicitudes asignadas.</p>
        </div>
      </main>
    )
  }

  const typedVehicle = vehicle as Vehicle
  const typedRequests = (requests || []) as TransportRequest[]
  const suggestedRoute = sortSuggestedRoute(
    typedRequests,
    typedVehicle.current_zone
  )

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">Panel del conductor</h1>
          <p className="text-slate-300 mb-6">
            Vista de pasajeros asignados y ruta sugerida.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400">Conductor</p>
              <p className="font-semibold">{typedVehicle.driver_name}</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400">Teléfono</p>
              <p className="font-semibold">{typedVehicle.driver_phone}</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400">Vehículo</p>
              <p className="font-semibold">
                {typedVehicle.vehicle_model || 'No informado'}
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400">Patente</p>
              <p className="font-semibold">{typedVehicle.plate}</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400">Zona actual</p>
              <p className="font-semibold">
                {typedVehicle.current_zone || 'Sin zona'}
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400">Estado</p>
              <p className="font-semibold">{typedVehicle.status}</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Ruta sugerida</h2>
            <span className="text-sm text-slate-300">
              {suggestedRoute.length} pasajeros / paradas
            </span>
          </div>

          {suggestedRoute.length === 0 ? (
            <p className="text-slate-300">
              No hay pasajeros asignados a este conductor.
            </p>
          ) : (
            <div className="space-y-4">
              {suggestedRoute.map((request, index) => (
                <div
                  key={request.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <p className="text-sm text-green-400 font-semibold">
                        Parada #{index + 1}
                      </p>
                      <h3 className="text-lg font-bold">{request.full_name}</h3>
                      <p className="text-slate-300">{request.phone}</p>
                    </div>

                    <div className="text-sm text-slate-300">
                      <p>
                        <span className="text-slate-400">Hora:</span>{' '}
                        {request.requested_time}
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
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-slate-400">Recogida</p>
                      <p className="font-medium">{request.pickup_address}</p>
                      <p className="text-slate-300">
                        Zona: {request.pickup_zone || 'Sin zona'}
                      </p>
                    </div>

                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-slate-400">Destino</p>
                      <p className="font-medium">
                        {request.destination_address}
                      </p>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-3 text-sm">
                      <p className="text-slate-400">Observaciones</p>
                      <p>{request.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">Resumen de la ruta</h2>

          {suggestedRoute.length === 0 ? (
            <p className="text-slate-300">Sin ruta sugerida por ahora.</p>
          ) : (
            <ol className="list-decimal list-inside space-y-2 text-slate-200">
              <li>
                Salida desde zona actual:{' '}
                {typedVehicle.current_zone || 'Sin zona'}
              </li>
              {suggestedRoute.map((request) => (
                <li key={request.id}>
                  Recoger a {request.full_name} en {request.pickup_address}
                  {request.pickup_zone ? ` (${request.pickup_zone})` : ''}
                  {' → '}
                  destino: {request.destination_address}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  )
}