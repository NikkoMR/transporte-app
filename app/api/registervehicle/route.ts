import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

  console.log('KAPSO REGISTER VEHICLE STATUS:', response.status)
  console.log('KAPSO REGISTER VEHICLE RESULT:', data)

  if (!response.ok) {
    console.error('KAPSO REGISTER VEHICLE ERROR:', data)
    throw new Error(Kapso devolvió ${response.status})
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const {
      driver_name,
      driver_phone,
      plate,
      vehicle_model,
      capacity_total,
      current_zone,
      notes,
    } = body

    if (
      !driver_name ||
      !driver_phone ||
      !plate ||
      !capacity_total ||
      !current_zone
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    const totalCapacity = Number(capacity_total)

    if (totalCapacity <= 0) {
      return NextResponse.json(
        { error: 'La capacidad total debe ser mayor a 0' },
        { status: 400 }
      )
    }

    const normalizedZone = normalizeZone(current_zone)

    // 1. Crear vehículo
    const { data: vehicle, error: insertVehicleError } = await supabase
      .from('vehicles')
      .insert([
        {
          driver_name,
          driver_phone,
          plate,
          vehicle_model: vehicle_model || null,
          capacity_total: totalCapacity,
          capacity_available: totalCapacity,
          current_zone: normalizedZone,
          status: 'disponible',
          notes: notes || null,
        },
      ])
      .select()
      .single()

    if (insertVehicleError || !vehicle) {
      console.error('ERROR INSERT VEHICLE:', insertVehicleError)
      return NextResponse.json(
        { error: insertVehicleError?.message || 'Error guardando vehículo' },
        { status: 400 }
      )
    }

    // 2. Buscar solicitud pendiente compatible
    const { data: pendingRequest, error: pendingRequestError } = await supabase
      .from('transport_requests')
      .select('*')
      .eq('status', 'pendiente')
      .eq('pickup_zone', normalizedZone)
      .lte('passenger_count', totalCapacity)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (pendingRequestError) {
      console.error('ERROR BUSCANDO PENDIENTE:', pendingRequestError)

      return NextResponse.json({
        success: true,
        vehicle,
        auto_assigned: false,
        message: 'Vehículo registrado correctamente ✅',
      })
    }

    // 3. Si no hay pendiente, terminar normal
    if (!pendingRequest) {
      return NextResponse.json({
        success: true,
        vehicle,
        auto_assigned: false,
        message: 'Vehículo registrado correctamente ✅',
      })
    }

    const passengerCount = Number(pendingRequest.passenger_count)
    const newCapacity = totalCapacity - passengerCount
    const newVehicleStatus = newCapacity > 0 ? 'disponible' : 'completo'

    // 4. Actualizar vehículo
    const { error: updateVehicleError } = await supabase
      .from('vehicles')
      .update({
        capacity_available: newCapacity,
        status: newVehicleStatus,
      })
      .eq('id', vehicle.id)

    if (updateVehicleError) {
      console.error('ERROR UPDATE VEHICLE AFTER MATCH:', updateVehicleError)
      return NextResponse.json({
        success: true,
        vehicle,
        auto_assigned: false,
        message:
          'Vehículo registrado, pero no se pudo actualizar después del match.',
      })
    }

    // 5. Actualizar solicitud pendiente
    const { error: updateRequestError } = await supabase
      .from('transport_requests')
      .update({
        status: 'asignado',
        assigned_vehicle_id: vehicle.id,
      })
      .eq('id', pendingRequest.id)

    if (updateRequestError) {
      console.error('ERROR UPDATE REQUEST AFTER MATCH:', updateRequestError)
      return NextResponse.json({
        success: true,
        vehicle,
        auto_assigned: false,
        message:
          'Vehículo registrado, pero no se pudo asignar la solicitud pendiente.',
      })
    }

    // 6. Tracking URL
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin

    const trackingUrl = ${baseUrl}/tracking/${pendingRequest.id}

    // 7. WhatsApp al pasajero
    try {
      await sendKapsoTemplate({
        phone: pendingRequest.phone,
        name: pendingRequest.full_name,
        driver: vehicle.driver_name,
        vehicle: vehicle.vehicle_model || 'No informado',
        plate: vehicle.plate,
        trackingUrl,
      })
    } catch (whatsappError) {
      console.error(
        'WHATSAPP ERROR FROM REGISTER VEHICLE:',
        whatsappError
      )
    }

    return NextResponse.json({
      success: true,
      vehicle: {
        ...vehicle,
        capacity_available: newCapacity,
        status: newVehicleStatus,
      },
      auto_assigned: true,
      assigned_request_id: pendingRequest.id,
      trackingUrl,
      message:
        'Vehículo registrado y se asignó automáticamente una solicitud pendiente ✅',
    })
  } catch (err) {
    console.error('ERROR GENERAL:', err)
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    )
  }
}