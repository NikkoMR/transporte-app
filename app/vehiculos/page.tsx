'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function VehiculosPage() {

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    driver_name: '',
    driver_phone: '',
    plate: '',
    vehicle_model: '',
    capacity_total: '',
    capacity_available: '',
    current_zone: '',
    available_from: '',
    notes: ''
  })

  function handleChange(e: any) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  async function handleSubmit(e: any) {

    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {

      const { data, error } = await supabase
        .from('vehicles')
        .insert([
          {
            driver_name: form.driver_name,
            driver_phone: form.driver_phone,
            plate: form.plate,
            vehicle_model: form.vehicle_model,
            capacity_total: Number(form.capacity_total),
            capacity_available: Number(form.capacity_available),
            current_zone: form.current_zone,
            available_from: form.available_from || null,
            notes: form.notes || null,
            status: 'disponible'
          }
        ])
        .select('id')
        .single()

      if (error || !data) {
        console.error('ERROR VEHICULO:', error)
        setMessage(`Error guardando vehículo: ${error?.message ?? 'sin detalle'}`)
        setLoading(false)
        return
      }

      setMessage('Vehículo registrado correctamente')

      setTimeout(() => {
        window.location.href = `/chofer/${data.id}`
      }, 800)

    } catch (err: any) {

      console.error(err)
      setMessage('Error inesperado guardando vehículo')

    }

    setLoading(false)

  }

  return (

    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-6">

      <div className="w-full max-w-lg bg-slate-900 p-8 rounded-xl shadow-xl">

        <h1 className="text-2xl text-white font-semibold mb-6 text-center">
          Registro de vehículo
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            name="driver_name"
            placeholder="Nombre del conductor"
            value={form.driver_name}
            onChange={handleChange}
            required
            className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-white"
          />

          <input
            name="driver_phone"
            placeholder="Teléfono del conductor"
            value={form.driver_phone}
            onChange={handleChange}
            required
            className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-white"
          />

          <input
            name="plate"
            placeholder="Patente"
            value={form.plate}
            onChange={handleChange}
            required
            className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-white"
          />

          <input
            name="vehicle_model"
            placeholder="Modelo del vehículo"
            value={form.vehicle_model}
            onChange={handleChange}
            required
            className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-white"
          />

          <div className="flex gap-4">

            <input
              type="number"
              name="capacity_total"
              placeholder="Capacidad total"
              value={form.capacity_total}
              onChange={handleChange}
              required
              className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-white"
            />

            <input
              type="number"
              name="capacity_available"
              placeholder="Cupos disponibles"
              value={form.capacity_available}
              onChange={handleChange}
              required
              className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-white"
            />

          </div>

          <input
            name="current_zone"
            placeholder="Zona actual"
            value={form.current_zone}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-white"
          />

          <input
            type="time"
            name="available_from"
            value={form.available_from}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-white"
          />

          <textarea
            name="notes"
            placeholder="Observaciones"
            value={form.notes}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-white"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 text-white p-3 font-medium"
          >
            {loading ? 'Guardando...' : 'Guardar vehículo'}
          </button>

          {message && (
            <p className="text-center text-sm text-red-400 pt-2">
              {message}
            </p>
          )}

        </form>

      </div>

    </main>
  )
}