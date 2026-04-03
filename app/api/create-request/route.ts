import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type RequestBody = {
  full_name: string
  phone: string
  pickup_address: string
  pickup_zone?: string | null
  destination_address: string
  trip_date: string
  requested_time: string
  passenger_count: number
  notes?: string | null
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
    `https://api.kapso.ai/meta/whatsapp/v24.0/${process.env.KAPSO_PHONE_ID}/messages`,
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
    throw new Error(`Error enviando template a Kapso: ${response.status}`)
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody

    if (
      !body.full_name ||
      !body.phone ||
      !body.pickup_address ||
      !body.destination_address ||
      !body.trip_date ||
      !body.requested_time ||
      !body.passenger_count
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: 'Faltan variables de Supabase' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: insertedRequest, error: insertError } = await supabase
      .from('transport_requests')
      .insert([
        {
          full_name: body.full_name,
          phone: body.phone,
          pickup_address: body.pickup_address,
          pickup_zone: body.pickup_zone || null,
          destination_address: body.destination_address,
          trip_date: body.trip_date,
          requested_time: body.requested_time,
          passenger_count: body.passenger_count,
          notes: body.notes || null,
          status: 'pendiente',
        },
      ])
      .select('*')
      .single()

    if (insertError || !insertedRequest) {
      console.error(insertError)
      return NextResponse.json(
        { error: 'Error creando solicitud' },
        { status: 500 }
      )
    }

    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'disponible')

    if (vehiclesError) {
      console.error(vehiclesError)
      return NextResponse.json(
        { error: 'Error cargando vehículos' },
        { status: 500 }
      )
    }

    const vehicles = ((vehiclesData as Vehicle[]) || []).filter(
      (v) => v.capacity_available >= body.passenger_count
    )

    const zone = normalizeZone(body.pickup_zone)

    const sameZoneVehicle = vehicles.find(
      (v) => normalizeZone(v.current_zone) === zone
    )

    const fallbackVehicle = vehicles.find(
      (v) => v.capacity_available >= body.passenger_count
    )

    const selectedVehicle = sameZoneVehicle || fallbackVehicle

    if (!selectedVehicle) {
      return NextResponse.json({
        success: true,
        assigned: false,
        message: 'Solicitud creada. Quedó pendiente por falta de vehículos.',
      })
    }

    const newCapacity =
      selectedVehicle.capacity_available - Number(body.passenger_count)

    const newVehicleStatus = newCapacity <= 0 ? 'completo' : 'disponible'

    const { error: updateRequestError } = await supabase
      .from('transport_requests')
      .update({
        status: 'asignado',
        assigned_vehicle_id: selectedVehicle.id,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', insertedRequest.id)

    if (updateRequestError) {
      console.error(updateRequestError)
      return NextResponse.json(
        { error: 'No se pudo asignar la solicitud' },
        { status: 500 }
      )
    }

    const { error: updateVehicleError } = await supabase
      .from('vehicles')
      .update({
        capacity_available: newCapacity,
        status: newVehicleStatus,
      })
      .eq('id', selectedVehicle.id)

    if (updateVehicleError) {
      console.error(updateVehicleError)
      return NextResponse.json(
        { error: 'La solicitud se asignó, pero no se pudo actualizar el vehículo' },
        { status: 500 }
      )
    }

    await supabase.from('trip_events').insert([
      {
        request_id: insertedRequest.id,
        vehicle_id: selectedVehicle.id,
        event_type: 'asignado',
        event_note: `Solicitud asignada automáticamente a ${selectedVehicle.driver_name} (${selectedVehicle.plate})`,
      },
    ])

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin

    const trackingUrl = `${baseUrl}/tracking/${insertedRequest.id}`

    console.log('TRACKING URL GENERADO:', trackingUrl)

    try {
      await sendKapsoTemplate({
        phone: body.phone,
        name: body.full_name,
        driver: selectedVehicle.driver_name,
        vehicle: selectedVehicle.vehicle_model || 'No informado',
        plate: selectedVehicle.plate,
        trackingUrl,
      })
    } catch (whatsappError) {
      console.error('AUTO WHATSAPP ERROR:', whatsappError)
    }

    return NextResponse.json({
      success: true,
      assigned: true,
      requestId: insertedRequest.id,
      vehicle: selectedVehicle,
      trackingUrl,
      message: 'Solicitud creada y vehículo asignado automáticamente.',
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Error interno', details: String(error) },
      { status: 500 }
    )
  }
}