'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function VehiculosPage() {

  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    driver_name: '',
    phone: '',
    plate: '',
    vehicle_model: '',
    capacity_total: 1,
    capacity_available: 1,
    zone: '',
    available_from: '',
    notes: ''
  })

  function handleChange(e:any){
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  async function handleSubmit(e:any){

    e.preventDefault()

    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        driver_name: form.driver_name,
        phone: form.phone,
        plate: form.plate,
        vehicle_model: form.vehicle_model,
        capacity_total: form.capacity_total,
        capacity_available: form.capacity_available,
        zone: form.zone,
        available_from: form.available_from,
        notes: form.notes
      })
      .select()
      .single()

    if(error){
      setMessage('Error guardando vehículo')
      setLoading(false)
      return
    }

    // REDIRECCION AL PANEL DEL CHOFER
    router.push(`/chofer/${data.id}`)
  }

  return (

    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-6">

      <div className="w-full max-w-xl bg-slate-900 rounded-xl p-6">

        <h1 className="text-xl text-white mb-6 text-center">
          Registro de vehículo
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            name="driver_name"
            placeholder="Nombre del conductor"
            value={form.driver_name}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            required
          />

          <input
            name="phone"
            placeholder="Teléfono del conductor"
            value={form.phone}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            required
          />

          <input
            name="plate"
            placeholder="Patente"
            value={form.plate}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            required
          />

          <input
            name="vehicle_model"
            placeholder="Modelo del vehículo"
            value={form.vehicle_model}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
          />

          {/* CAPACIDAD */}

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="text-sm text-slate-300">
                Capacidad total
              </label>

              <input
                type="number"
                name="capacity_total"
                value={form.capacity_total}
                onChange={handleChange}
                min="1"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">
                Cupos disponibles
              </label>

              <input
                type="number"
                name="capacity_available"
                value={form.capacity_available}
                onChange={handleChange}
                min="0"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
                required
              />
            </div>

          </div>

          <input
            name="zone"
            placeholder="Zona actual"
            value={form.zone}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
          />

          <div>

            <label className="text-sm text-slate-300">
              Disponible desde
            </label>

            <input
              type="time"
              name="available_from"
              value={form.available_from}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            />

          </div>

          <textarea
            name="notes"
            placeholder="Observaciones"
            value={form.notes}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg"
          >
            {loading ? 'Guardando...' : 'Guardar vehículo'}
          </button>

          {message && (
            <p className="text-sm text-red-400 text-center">
              {message}
            </p>
          )}

        </form>

      </div>

    </main>
  )
}