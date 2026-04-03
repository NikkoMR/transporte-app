import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type VehicleBody = {
  driver_name: string
  driver_phone: string
  plate: string
  vehicle_model?: string | null
  capacity_total: number
  capacity_available: number
  current_zone?: string | null
  available_from?: string | null
  notes?: string | null
}

type PendingRequest = {
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

  console.log('REGISTERVEHICLE -> KAPSO STATUS:', response.status)
  console.log('REGISTERVEHICLE -> KAPSO RESULT:', data)

  if (!response.ok) {
    console.error('REGISTERVEHICLE -> KAPSO ERROR:', data)
    throw new Error(`Kapso devolvió ${response.status}`)
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/registervehicle',
    message: 'Ruta registervehicle operativa',
  })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VehicleBody

    if (
      !body.driver_name ||
      !body.driver_phone ||
      !body.plate ||
      !body.capacity_total ||
      body.capacity_available === undefined ||
      body.capacity_available === null
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios del vehículo' },
        { status: 400 }
      )
    }

    const capacityTotal = Number(body.capacity_total)
    const capacityAvailable = Number(body.capacity_available)

    if (
      capacityTotal <= 0 ||
      capacityAvailable < 0 ||
      capacityAvailable > capacityTotal
    ) {
      return NextResponse.json(
        { error: 'Los cupos no son válidos' },
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

    const vehicleStatus = capacityAvailable <= 0 ? 'completo' : 'disponible'

    const { data: insertedVehicle, error: insertVehicleError } = await supabase
      .from('vehicles')
      .insert([
        {
          driver_name: body.driver_name,
          driver_phone: body.driver_phone,
          plate: body.plate,
          vehicle_model: body.vehicle_model || null,
          capacity_total: capacityTotal,
          capacity_available: capacityAvailable,
          current_zone: body.current_zone?.trim() || null,
          available_from: body.available_from || null,
          status: vehicleStatus,
          notes: body.notes || null,
        },
      ])
      .select('*')
      .single()

    if (insertVehicleError || !insertedVehicle) {
      console.error('ERROR INSERTANDO VEHICULO:', insertVehicleError)
      return NextResponse.json(
        {
          error: 'Error guardando vehículo',
          details: insertVehicleError?.message || 'Insert fallido',
        },
        { status: 500 }
      )
    }

    if (capacityAvailable <= 0) {
      return NextResponse.json({
        success: true,
        vehicle: insertedVehicle,
        assignedRequest: null,
        message: 'Vehículo guardado sin cupos disponibles.',
      })
    }

    const { data: pendingRequestsData, error: pendingRequestsError } =
      await supabase
        .from('transport_requests')
        .select('*')
        .eq('status', 'pendiente')
        .order('trip_date', { ascending: true })
        .order('requested_time', { ascending: true })
        .order('created_at', { ascending: true })

    if (pendingRequestsError) {
      console.error('ERROR CARGANDO PENDIENTES:', pendingRequestsError)
      return NextResponse.json(
        {
          success: true,
          vehicle: insertedVehicle,
          assignedRequest: null,
          message: 'Vehículo guardado, pero no se pudieron revisar pendientes.',
        },
        { status: 200 }
      )
    }

    const pendingRequests = (pendingRequestsData as PendingRequest[]) || []

    const compatibleSameZone = pendingRequests.find((request) => {
      return (
        Number(request.passenger_count) <= capacityAvailable &&
        normalizeZone(request.pickup_zone) ===
          normalizeZone(insertedVehicle.current_zone)
      )
    })

    const compatibleFallback = pendingRequests.find((request) => {
      return Number(request.passenger_count) <= capacityAvailable
    })

    const selectedRequest = compatibleSameZone || compatibleFallback

    if (!selectedRequest) {
      return NextResponse.json({
        success: true,
        vehicle: insertedVehicle,
        assignedRequest: null,
        message: 'Vehículo guardado. No había solicitudes pendientes compatibles.',
      })
    }

    const newCapacityAvailable =
      Number(insertedVehicle.capacity_available) -
      Number(selectedRequest.passenger_count)

    const newVehicleStatus =
      newCapacityAvailable <= 0 ? 'completo' : 'disponible'

    const { error: updateRequestError } = await supabase
      .from('transport_requests')
      .update({
        status: 'asignado',
        assigned_vehicle_id: insertedVehicle.id,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', selectedRequest.id)

    if (updateRequestError) {
      console.error('ERROR ACTUALIZANDO SOLICITUD:', updateRequestError)
      return NextResponse.json(
        {
          success: true,
          vehicle: insertedVehicle,
          assignedRequest: null,
          message:
            'Vehículo guardado, pero no se pudo asignar la solicitud pendiente.',
        },
        { status: 200 }
      )
    }

    const { error: updateVehicleError } = await supabase
      .from('vehicles')
      .update({
        capacity_available: newCapacityAvailable,
        status: newVehicleStatus,
      })
      .eq('id', insertedVehicle.id)

    if (updateVehicleError) {
      console.error('ERROR ACTUALIZANDO VEHICULO:', updateVehicleError)
      return NextResponse.json(
        {
          success: true,
          vehicle: insertedVehicle,
          assignedRequest: selectedRequest,
          message:
            'Se asignó la solicitud, pero falló la actualización de cupos.',
        },
        { status: 200 }
      )
    }

    await supabase.from('trip_events').insert([
      {
        request_id: selectedRequest.id,
        vehicle_id: insertedVehicle.id,
        event_type: 'asignado',
        event_note: `Solicitud pendiente asignada automáticamente al registrar vehículo ${insertedVehicle.driver_name} (${insertedVehicle.plate})`,
      },
    ])

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin

    const trackingUrl = `${baseUrl}/tracking/${selectedRequest.id}`

    try {
      await sendKapsoTemplate({
        phone: selectedRequest.phone,
        name: selectedRequest.full_name,
        driver: insertedVehicle.driver_name,
        vehicle: insertedVehicle.vehicle_model || 'No informado',
        plate: insertedVehicle.plate,
        trackingUrl,
      })
    } catch (whatsappError) {
      console.error('AUTO ASSIGN FROM VEHICLE -> WHATSAPP ERROR:', whatsappError)
    }

    return NextResponse.json({
      success: true,
      vehicle: {
        ...insertedVehicle,
        capacity_available: newCapacityAvailable,
        status: newVehicleStatus,
      } as Vehicle,
      assignedRequest: selectedRequest,
      trackingUrl,
      message:
        'Vehículo guardado y se asignó automáticamente una solicitud pendiente.',
    })
  } catch (error) {
    console.error('ERROR INTERNO REGISTERVEHICLE:', error)

    return NextResponse.json(
      { error: 'Error interno registrando vehículo', details: String(error) },
      { status: 500 }
    )
  }
}