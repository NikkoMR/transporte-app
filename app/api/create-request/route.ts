import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
        { error: 'La cantidad de pasajeros no es válida' },
        { status: 400 }
      )
    }

    // 1. Guardar solicitud
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .insert({
        full_name,
        phone,
        pickup_address,
        pickup_zone: normalizeZone(pickup_zone),
        destination_address,
        trip_date,
        requested_time,
        passenger_count: passengerCount,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (requestError || !request) {
      console.error('ERROR INSERT REQUEST:', requestError)
      return NextResponse.json(
        { error: 'Error guardando la solicitud' },
        { status: 500 }
      )
    }

    // 2. Buscar vehículos compatibles
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'disponible')
      .eq('current_zone', normalizeZone(pickup_zone))
      .gte('capacity_available', passengerCount)

    if (vehicleError) {
      console.error('ERROR LOAD VEHICLES:', vehicleError)
      return NextResponse.json(
        { error: 'Error buscando vehículos disponibles' },
        { status: 500 }
      )
    }

    // 3. Si hay vehículo → asignar
    if (vehicles && vehicles.length > 0) {
      const selectedVehicle = vehicles[0]

      const newCapacity =
        Number(selectedVehicle.capacity_available) - passengerCount

      const newStatus = newCapacity > 0 ? 'disponible' : 'completo'

      const { error: updateVehicleError } = await supabase
        .from('vehicles')
        .update({
          capacity_available: newCapacity,
          status: newStatus,
        })
        .eq('id', selectedVehicle.id)

      if (updateVehicleError) {
        console.error('ERROR UPDATE VEHICLE:', updateVehicleError)
        return NextResponse.json(
          { error: 'Error actualizando el vehículo' },
          { status: 500 }
        )
      }

      const { error: updateRequestError } = await supabase
        .from('requests')
        .update({
          status: 'assigned',
          vehicle_id: selectedVehicle.id,
        })
        .eq('id', request.id)

      if (updateRequestError) {
        console.error('ERROR UPDATE REQUEST:', updateRequestError)
        return NextResponse.json(
          { error: 'Error asignando la solicitud' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        assigned: true,
        vehicle: selectedVehicle,
        message: 'Asignado automáticamente 🚗',
      })
    }

    // 4. Si no hay vehículo → queda pendiente
    return NextResponse.json({
      success: true,
      assigned: false,
      message: 'Quedó pendiente ⏳',
    })
  } catch (error) {
    console.error('ERROR CREATE REQUEST:', error)

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}