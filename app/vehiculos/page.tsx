'use client'

import { useState } from 'react'

import { COMUNAS } from '../lib/comunas'

export default function VehiculosPage() {
  const [form, setForm] = useState({
    driver_name: '',
    driver_phone: '',
    plate: '',
    vehicle_model: '',
    capacity_total: '4',
    capacity_available: '4',
    current_zone: '',
    notes: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target

    setForm((prev) => {
      const next = { ...prev, [name]: value }

      if (name === 'capacity_total') {
        next.capacity_available = value
      }

      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/registervehicle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver_name: form.driver_name,
          driver_phone: form.driver_phone,
          plate: form.plate,
          vehicle_model: form.vehicle_model,
          capacity_total: Number(form.capacity_total),
          current_zone: form.current_zone,
          notes: form.notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || 'Error guardando vehículo')
        setLoading(false)
        return
      }

      setMessage('Vehículo registrado correctamente ✅')

      if (result?.vehicle?.id) {
        window.location.href = `/conductor/${result.vehicle.id}`
        return
      }

      setForm({
        driver_name: '',
        driver_phone: '',
        plate: '',
        vehicle_model: '',
        capacity_total: '4',
        capacity_available: '4',
        current_zone: '',
        notes: '',
      })
    } catch (error) {
      console.error(error)
      setMessage('Error guardando vehículo')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Registro de vehículo</h1>
        <p className="text-slate-300 mb-8">
          Registra un conductor y su vehículo disponible para asignación automática.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-slate-900 p-6 rounded-2xl border border-slate-800"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              placeholder="Teléfono"
              value={form.driver_phone}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              placeholder="Vehículo"
              value={form.vehicle_model}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              name="capacity_total"
              min="1"
              value={form.capacity_total}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
              required
            />

            <input
              type="number"
              name="capacity_available"
              min="1"
              value={form.capacity_available}
              readOnly
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 opacity-80 cursor-not-allowed"
            />
          </div>

          <select
            name="current_zone"
            value={form.current_zone}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            required
          >
            <option value="">Selecciona comuna</option>
            {COMUNAS.map((comuna) => (
              <option key={comuna} value={comuna}>
                {comuna}
              </option>
            ))}
          </select>

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
            className="w-full rounded-lg bg-green-600 hover:bg-green-500 transition px-4 py-3 font-semibold disabled:opacity-60"
          >
            {loading ? 'Guardando...' : 'Registrar vehículo'}
          </button>

          {message && <p className="text-sm text-slate-200 pt-2">{message}</p>}
        </form>
      </div>
    </main>
  )
}