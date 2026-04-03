import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeZone(value: string | null | undefined) {
  return (value || '').trim().toUpperCase()
}

function cleanPhone(phone: string) {
  return String(phone).replace(/\D/g, '')
}

async function sendKapsoTemplate(params: {
  phone: string
  name: string
  driver: string
  vehicle: string
  plate: string
  trackingUrl: string
}) {
  if (!process.env.KAPSO_API_KEY || !process.env.KAPSO_PHONE_ID) {
    throw new Error('Faltan KAPSO_API_KEY o KAPSO_PHONE_ID')
  }

  const response = await fetch(
    https://api.kapso.ai/meta/whatsapp/v24.0/${process.env.KAPSO_PHONE_ID}/messages,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.KAPSO_API_KEY,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone(params.phone),
        type: 'template',
        template: {
          name: 'transporte_asignado',
          language: {
            code: 'es_ES',
          },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: params.name },
                { type: 'text', text: params.driver },
                { type: 'text', text: params.vehicle },
                { type: 'text', text: params.plate },
                { type: 'text', text: params.trackingUrl },
              ],
            },
          ],
        },
      }),
    }
  )

  const data = await response.json()

  console.log('KAPSO TEMPLATE STATUS:', response.status)
  console.log('KAPSO TEMPLATE RESULT:', data)

  if (!response.ok) {
    console.error('KAPSO TEMPLATE ERROR:', data)
    throw new Error(Kapso devolvió ${response.status})
  }
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
      .ilike('current_zone', %${normalizedPickupZone}%)
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

    // 2. Insertar solicitud y devolver registro creado
    const { data: insertedRequest, error } = await supabase
      .from('transport_requests')
      .insert([
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
      .select('*')
      .single()

    if (error || !insertedRequest) {
      console.error(error)
      return NextResponse.json({ error: error?.message || 'Error insertando solicitud' }, { status: 400 })
    }

    // 3. Si fue asignado, mandar WhatsApp
    if (vehicle && assigned_vehicle_id) {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin

      const trackingUrl = ${baseUrl}/tracking/${insertedRequest.id}

      try {
        await sendKapsoTemplate({
          phone,
          name: full_name,
          driver: vehicle.driver_name,
          vehicle: vehicle.vehicle_model || 'No informado',
          plate: vehicle.plate,
          trackingUrl,
        })
      } catch (whatsappError) {
        console.error('WHATSAPP CREATE-REQUEST ERROR:', whatsappError)
      }

      return NextResponse.json({
        success: true,
        assigned: true,
        requestId: insertedRequest.id,
        vehicle,
        trackingUrl,
      })
    }

    return NextResponse.json({
      success: true,
      assigned: false,
      requestId: insertedRequest.id,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    )
  }
}