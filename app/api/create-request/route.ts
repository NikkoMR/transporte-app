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

async function sendKapsoPassengerTemplate(params: {
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
        'X-API-Key': process.env.KAPSO_API_KEY!,
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

  console.log('KAPSO PASAJERO STATUS:', response.status)
  console.log('KAPSO PASAJERO RESULT:', data)

  if (!response.ok) {
    console.error('KAPSO PASAJERO ERROR:', data)
    throw new Error(`Kapso pasajero devolvió ${response.status}`)
  }
}

async function sendKapsoDriverTemplate(params: {
  phone: string
  driverName: string
  passengerName: string
  passengerPhone: string
  pickupAddress: string
  destinationAddress: string
  requestedTime: string
  passengerCount: string
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
        'X-API-Key': process.env.KAPSO_API_KEY!,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone(params.phone),
        type: 'template',
        template: {
          name: 'nuevo_viaje_chofer',
          language: {
            code: 'es',
          },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: params.driverName },
                { type: 'text', text: params.passengerName },
                { type: 'text', text: params.passengerPhone },
                { type: 'text', text: params.pickupAddress },
                { type: 'text', text: params.destinationAddress },
                { type: 'text', text: params.requestedTime },
                { type: 'text', text: params.passengerCount },
              ],
            },
          ],
        },
      }),
    }
  )

  const data = await response.json()

  console.log('KAPSO CHOFER STATUS:', response.status)
  console.log('KAPSO CHOFER RESULT:', data)

  if (!response.ok) {
    console.error('KAPSO CHOFER ERROR:', data)
    throw new Error(`Kapso chofer devolvió ${response.status}`)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      passenger_user_id,
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

    /*
      Buscamos choferes disponibles y comparamos la comuna en JS.
      Esto evita problemas con ilike, mayúsculas, espacios o formatos.
    */
    const { data: availableDrivers, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('activo', true)
      .eq('disponible', true)
      .gte('capacidad', passengerCount)
      .order('created_at', { ascending: true })

    if (driverError) {
      console.error('ERROR BUSCANDO CHOFER:', driverError)
      return NextResponse.json(
        { error: 'Error buscando chofer disponible' },
        { status: 500 }
      )
    }

    const driver =
      availableDrivers?.find(
        (d) => normalizeZone(d.comuna_base) === normalizedPickupZone
      ) || null

    console.log('PICKUP NORMALIZADO:', normalizedPickupZone)
    console.log(
      'CHOFERES DISPONIBLES:',
      availableDrivers?.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        comuna_base: d.comuna_base,
        comuna_normalizada: normalizeZone(d.comuna_base),
        capacidad: d.capacidad,
        disponible: d.disponible,
        activo: d.activo,
      }))
    )
    console.log('CHOFER SELECCIONADO:', driver)

    let assigned_driver_id = null
    let status = 'pendiente'

    if (driver) {
      assigned_driver_id = driver.id
      status = 'asignado'

      const { error: updateDriverError } = await supabase
        .from('drivers')
        .update({
          disponible: false,
        })
        .eq('id', driver.id)

      if (updateDriverError) {
        console.error('ERROR ACTUALIZANDO CHOFER:', updateDriverError)
        return NextResponse.json(
          { error: 'Error actualizando disponibilidad del chofer' },
          { status: 500 }
        )
      }
    }

    const { data: insertedRequest, error: insertError } = await supabase
      .from('transport_requests')
      .insert([
        {
          passenger_user_id: passenger_user_id || null,
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
          assigned_driver_id,
        },
      ])
      .select('*')
      .single()

    if (insertError || !insertedRequest) {
      console.error('ERROR INSERTANDO SOLICITUD:', insertError)
      return NextResponse.json(
        { error: insertError?.message || 'Error insertando solicitud' },
        { status: 400 }
      )
    }

    if (driver && assigned_driver_id) {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin

      const trackingUrl = `${baseUrl}/tracking/${insertedRequest.id}`

      try {
        await sendKapsoPassengerTemplate({
          phone,
          name: full_name,
          driver: driver.nombre,
          vehicle: 'Vehículo asignado',
          plate: driver.patente || 'No informado',
          trackingUrl,
        })
      } catch (whatsappPassengerError) {
        console.error(
          'WHATSAPP PASAJERO CREATE-REQUEST ERROR:',
          whatsappPassengerError
        )
      }

      try {
        await sendKapsoDriverTemplate({
          phone: driver.telefono,
          driverName: driver.nombre,
          passengerName: full_name,
          passengerPhone: phone,
          pickupAddress: pickup_address,
          destinationAddress: destination_address,
          requestedTime: requested_time,
          passengerCount: String(passengerCount),
        })
      } catch (whatsappDriverError) {
        console.error(
          'WHATSAPP CHOFER CREATE-REQUEST ERROR:',
          whatsappDriverError
        )
      }

      return NextResponse.json({
        success: true,
        assigned: true,
        requestId: insertedRequest.id,
        driver,
        trackingUrl,
      })
    }

    return NextResponse.json({
      success: true,
      assigned: false,
      requestId: insertedRequest.id,
    })
  } catch (err) {
    console.error('ERROR INTERNO CREATE-REQUEST:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}