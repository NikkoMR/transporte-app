import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeZone(value: string | null | undefined) {
  return (value || '').trim().toUpperCase()
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      full_name,
      phone,
      pickup_address,
      pickup_zone,
      destination_address,
      trip_date,
      requested_time,
      passenger_count,
      notes,
    } = body

    if (
      !full_name ||
      !phone ||
      !pickup_address ||
      !pickup_zone ||
      !destination_address ||
      !trip_date ||
      !requested_time ||
      !passenger_count
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    const passengerCount = Number(passenger_count)

    if (passengerCount <= 0) {
      return NextResponse.json(
        { error: 'Cantidad de pasajeros inválida' },
        { status: 400 }
      )
    }

    const normalizedPickupZone = normalizeZone(pickup_zone)

    // 1. Buscar vehículo disponible por zona
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'disponible')
      .gte('capacity_available', passengerCount)
      .ilike('current_zone', `%${normalizedPickupZone}%`)
      .limit(1)
      .maybeSingle()

    if (vehicleError) {
      console.error(vehicleError)
      return NextResponse.json(
        { error: 'Error buscando vehículo disponible' },
        { status: 500 }
      )
    }

    let assigned_vehicle_id = null
    let status = 'pendiente'

    if (vehicle) {
      assigned_vehicle_id = vehicle.id
      status = 'asignado'

      const newCapacity = Number(vehicle.capacity_available) - passengerCount
      const newVehicleStatus = newCapacity > 0 ? 'disponible' : 'completo'

      // actualizar cupos
      const { error: updateVehicleError } = await supabase
        .from('vehicles')
        .update({
          capacity_available: newCapacity,
          status: newVehicleStatus,
        })
        .eq('id', vehicle.id)

      if (updateVehicleError) {
        console.error(updateVehicleError)
        return NextResponse.json(
          { error: 'Error actualizando capacidad del vehículo' },
          { status: 500 }
        )
      }
    }

    // 2. Insertar solicitud
    const { error } = await supabase.from('transport_requests').insert([
      {
        full_name,
        phone,
        pickup_address,
        pickup_zone: normalizedPickupZone,
        destination_address,
        trip_date,
        requested_time,
        passenger_count: passengerCount,
        notes: notes || null,
        status,
        assigned_vehicle_id,
      },
    ])

    if (error) {
      console.error(error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      assigned: !!assigned_vehicle_id,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    )
  }
}