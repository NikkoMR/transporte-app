'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function VehiculosPage() {
  const [form, setForm] = useState({
    driver_name: '',
    driver_phone: '',
    plate: '',
    vehicle_model: '',
    capacity_total: 1,
    current_zone: '',
    available_from: '',
    notes: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: name === 'capacity_total' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.from('vehicles').insert([
      {
        ...form,
        capacity_available: form.capacity_total,
        status: 'disponible',
      },
    ])

    if (error) {
      setMessage('Error al guardar el vehículo')
      console.error(error)
    } else {
      setMessage('Vehículo guardado correctamente')
      setForm({
        driver_name: '',
        driver_phone: '',
        plate: '',
        vehicle_model: '',
        capacity_total: 1,
        current_zone: '',
        available_from: '',
        notes: '',
      })
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Registro de vehículos</h1>
        <p className="text-slate-300 mb-8">
          Completa este formulario para registrar un auto disponible.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-slate-900 p-6 rounded-2xl border border-slate-800"
        >
          <input
            name="driver_name"
            placeholder="Nombre del conductor"
            value={form.driver_name}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            required
          />

          <input
            name="driver_phone"
            placeholder="Teléfono del conductor"
            value={form.driver_phone}
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

          <div>
            <label className="text-sm text-slate-300 block mb-1">
              Capacidad total del vehículo
            </label>
            <input
              type="number"
              name="capacity_total"
              min="1"
              value={form.capacity_total}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
              required
            />
          </div>

          <input
            name="current_zone"
            placeholder="Zona actual"
            value={form.current_zone}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
          />

          <input
            type="time"
            name="available_from"
            value={form.available_from}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
          />

          <textarea
            name="notes"
            placeholder="Observaciones"
            value={form.notes}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 min-h-28"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 transition px-4 py-3 font-semibold disabled:opacity-60"
          >
            {loading ? 'Guardando...' : 'Guardar vehículo'}
          </button>

          {message && <p className="text-sm text-slate-200 pt-2">{message}</p>}
        </form>
      </div>
    </main>
  )
}