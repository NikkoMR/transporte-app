import { NextResponse } from 'next/server'

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
    console.error('Faltan KAPSO_API_KEY o KAPSO_PHONE_ID')
    return
  }

  try {
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

    console.log('WHATSAPP STATUS:', response.status)
    console.log('WHATSAPP RESULT:', data)

    if (!response.ok) {
      console.error('WHATSAPP ERROR:', data)
    }
  } catch (error) {
    console.error('WHATSAPP EXCEPTION:', error)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ✅ VALIDACIÓN QUE PEDISTE
    if (
      !body.phone ||
      !body.name ||
      !body.driver ||
      !body.vehicle ||
      !body.plate ||
      !body.trackingUrl
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios para WhatsApp' },
        { status: 400 }
      )
    }

    // ✅ ENVÍO A KAPSO
    await sendKapsoTemplate({
      phone: body.phone,
      name: body.name,
      driver: body.driver,
      vehicle: body.vehicle,
      plate: body.plate,
      trackingUrl: body.trackingUrl,
    })

    return NextResponse.json({
      success: true,
      message: 'WhatsApp enviado correctamente',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Error enviando WhatsApp', details: String(error) },
      { status: 500 }
    )
  }
}