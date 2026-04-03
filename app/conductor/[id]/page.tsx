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
  NUNOA: 2,
  SANTIAGO: 3,
  SANTIAGO_CENTRO: 4,
  LAS_CONDES: 5,
  VITACURA: 6,
  LO_BARNECHEA: 7,
  LA_REINA: 8,
  MACUL: 9,
  SAN_MIGUEL: 10,
  LA_FLORIDA: 11,
  ESTACION_CENTRAL: 12,
  RECOLETA: 13,
  INDEPENDENCIA: 14,
  QUILICURA: 15,
  MAIPU: 16,
  PUENTE_ALTO: 17,
  QUILPUE: 18,
  QUILLOTA: 19,
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

function buildGoogleMapsUrl(
  vehicle: Vehicle,
  suggestedRoute: TransportRequest[]
) {
  if (suggestedRoute.length === 0) return null

  const origin = encodeURIComponent(
    vehicle.current_zone || suggestedRoute[0].pickup_address
  )

  const destination = encodeURIComponent(
    suggestedRoute[suggestedRoute.length - 1].destination_address
  )

  const waypoints = suggestedRoute
    .map((r) => encodeURIComponent(r.pickup_address))
    .join('|')

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`
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
        <div className="max-w-6xl mx-auto">
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
  const mapsUrl = buildGoogleMapsUrl(typedVehicle, suggestedRoute)

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">Panel del conductor</h1>
          <p className="text-slate-300 mb-6">
            Vista de pasajeros asignados y ruta recomendada.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400">Conductor</p>
              <p className="font-semibold">{typedVehicle.driver_name}</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400">Teléfono</p>
              <p className="font-semibold">{typedVehicle.driver_phone}</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400">Patente</p>
              <p className="font-semibold">{typedVehicle.plate}</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-400">Vehículo</p>
              <p className="font-semibold">
                {typedVehicle.vehicle_model || 'No informado'}
              </p>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Ruta sugerida</h2>
              <p className="text-slate-300 text-sm">
                {suggestedRoute.length} pasajeros / paradas activas
              </p>
            </div>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 transition px-4 py-3 rounded-lg font-semibold"
              >
                Abrir ruta en Google Maps
              </a>
            )}
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
                  className="bg-slate-800 border border-slate-700 rounded-xl p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <p className="text-green-400 font-semibold text-sm mb-1">
                        Parada #{index + 1}
                      </p>
                      <h3 className="text-xl font-bold">{request.full_name}</h3>
                      <p className="text-slate-300">{request.phone}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm min-w-[260px]">
                      <div className="bg-slate-900 rounded-lg p-3">
                        <p className="text-slate-400">Hora</p>
                        <p className="font-medium">{request.requested_time}</p>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <p className="text-slate-400">Pasajeros</p>
                        <p className="font-medium">{request.passenger_count}</p>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <p className="text-slate-400">Estado</p>
                        <p className="font-medium">{request.status}</p>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <p className="text-slate-400">Fecha</p>
                        <p className="font-medium">{request.trip_date}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-900 rounded-lg p-4">
                      <p className="text-slate-400 mb-1">Recogida</p>
                      <p className="font-medium">{request.pickup_address}</p>
                      <p className="text-slate-300">
                        Zona: {request.pickup_zone || 'Sin zona'}
                      </p>
                    </div>

                    <div className="bg-slate-900 rounded-lg p-4">
                      <p className="text-slate-400 mb-1">Destino</p>
                      <p className="font-medium">
                        {request.destination_address}
                      </p>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-4 bg-slate-900 rounded-lg p-4 text-sm">
                      <p className="text-slate-400 mb-1">Observaciones</p>
                      <p>{request.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">Resumen recomendado</h2>

          {suggestedRoute.length === 0 ? (
            <p className="text-slate-300">Sin ruta sugerida por ahora.</p>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-slate-400 text-sm">Salida sugerida</p>
                <p className="font-semibold">
                  Desde {typedVehicle.current_zone || 'zona actual no definida'}
                </p>
              </div>

              {suggestedRoute.map((request, index) => (
                <div key={request.id} className="bg-slate-800 rounded-xl p-4">
                  <p className="text-green-400 text-sm font-semibold">
                    Paso {index + 1}
                  </p>
                  <p className="font-medium">
                    Recoger a {request.full_name} en {request.pickup_address}
                  </p>
                  <p className="text-slate-300 text-sm">
                    {request.pickup_zone ? `Zona: ${request.pickup_zone} · ` : ''}
                    Destino: {request.destination_address}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}