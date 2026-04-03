import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function normalizeZone(value: string | null | undefined) {
  return (value || '').trim().toUpperCase()
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

    // 🧠 VALIDACIÓN BÁSICA
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

    const { data, error } = await supabase
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

    if (error) {
      console.error('ERROR INSERT VEHICLE:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      vehicle: data,
    })
  } catch (err) {
    console.error('ERROR GENERAL:', err)
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    )
  }
}