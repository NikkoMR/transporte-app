import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function normalizeZone(value: string | null | undefined) {
  return (value || '').trim().toUpperCase()
}

const NEAR_ZONES: Record<string, string[]> = {
  SANTIAGO: ['PROVIDENCIA', 'ÑUÑOA'],
  PROVIDENCIA: ['SANTIAGO', 'LAS CONDES'],
  LAS_CONDES: ['PROVIDENCIA', 'VITACURA'],
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert([
        {
          ...body,
          current_zone: normalizeZone(body.current_zone),
          status: 'disponible',
        },
      ])
      .select('*')
      .single()

    if (vehicleError || !vehicle) {
      console.error('ERROR INSERTANDO VEHICULO:', vehicleError)
      return NextResponse.json(
        { error: 'Error guardando vehículo' },
        { status: 500 }
      )
    }

    const { data: requests, error: requestsError } = await supabase
      .from('transport_requests')
      .select('*')
      .in('status', ['pendiente', 'Pendiente'])

    if (requestsError) {
      console.error('ERROR CARGANDO SOLICITUDES:', requestsError)
      return NextResponse.json(
        { error: 'Error cargando solicitudes pendientes' },
        { status: 500 }
      )
    }

    const capacity = Number(vehicle.capacity_available)
    const pendingRequests = requests || []

    const sameZone = pendingRequests.find(
      (r) =>
        normalizeZone(r.pickup_zone) === normalizeZone(vehicle.current_zone) &&
        Number(r.passenger_count) <= capacity
    )

    const nearZone = pendingRequests.find(
      (r) =>
        NEAR_ZONES[normalizeZone(vehicle.current_zone)]?.includes(
          normalizeZone(r.pickup_zone)
        ) && Number(r.passenger_count) <= capacity
    )

    const fallback = pendingRequests.find(
      (r) => Number(r.passenger_count) <= capacity
    )

    const selected = sameZone || nearZone || fallback

    if (!selected) {
      return NextResponse.json({
        success: true,
        vehicle,
        message: 'Vehículo guardado sin match',
      })
    }

    const { error: requestUpdateError } = await supabase
      .from('transport_requests')
      .update({
        status: 'asignado',
        assigned_vehicle_id: vehicle.id,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    if (requestUpdateError) {
      console.error('ERROR ACTUALIZANDO SOLICITUD:', requestUpdateError)
      return NextResponse.json(
        { error: 'Error asignando solicitud' },
        { status: 500 }
      )
    }

    const newCapacity = capacity - Number(selected.passenger_count)
    const newVehicleStatus = newCapacity <= 0 ? 'completo' : 'disponible'

    const { error: vehicleUpdateError } = await supabase
      .from('vehicles')
      .update({
        capacity_available: newCapacity,
        status: newVehicleStatus,
      })
      .eq('id', vehicle.id)

    if (vehicleUpdateError) {
      console.error('ERROR ACTUALIZANDO VEHICULO:', vehicleUpdateError)
      return NextResponse.json(
        { error: 'Error actualizando capacidad del vehículo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assigned: selected.id,
      vehicleId: vehicle.id,
      remainingCapacity: newCapacity,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'error' }, { status: 500 })
  }
}