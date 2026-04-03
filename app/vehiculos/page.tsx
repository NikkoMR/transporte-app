'use client'

import { useState } from 'react'

export default function VehiculosPage() {
  const [form, setForm] = useState({
    driver_name: '',
    driver_phone: '',
    plate: '',
    vehicle_model: '',
    capacity_total: '',
    capacity_available: '',
    current_zone: '',
    available_from: '',
    notes: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target

    setForm((prev) => {
      const next = { ...prev, [name]: value }

      // Auto llenar disponibles cuando se escribe total
      if (name === 'capacity_total' && !prev.capacity_available) {
        next.capacity_available = value
      }

      return next
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/register-vehicle', {
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
          capacity_available: Number(form.capacity_available),
          current_zone: form.current_zone,
          available_from: form.available_from,
          notes: form.notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(
          result?.details
            ? `Error: ${result.details}`
            : result?.error || 'Error guardando vehículo'
        )
        return
      }

      if (result.assignedRequest) {
        setMessage(
          `🚀 Vehículo guardado y se asignó automáticamente la solicitud de ${result.assignedRequest.full_name}`
        )
      } else {
        setMessage(result.message || 'Vehículo guardado correctamente')
      }

      setForm({
        driver_name: '',
        driver_phone: '',
        plate: '',
        vehicle_model: '',
        capacity_total: '',
        capacity_available: '',
        current_zone: '',
        available_from: '',
        notes: '',
      })
    } catch (error: any) {
      console.error(error)
      setMessage(`Error: ${error?.message || 'Load failed'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Registro de vehículo</h1>
        <p className="text-slate-300 mb-8">
          Registra un conductor y su vehículo disponible.
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
            placeholder="Modelo del vehículo (ej: Toyota Hilux)"
            value={form.vehicle_model}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="capacity_total"
              type="number"
              min="1"
              placeholder="Asientos totales"
              value={form.capacity_total}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
              required
            />

            <input
              name="capacity_available"
              type="number"
              min="0"
              placeholder="Asientos disponibles"
              value={form.capacity_available}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
              required
            />
          </div>

          <input
            name="current_zone"
            placeholder="Zona / Comuna (ej: Quilpué)"
            value={form.current_zone}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
          />

          <input
            name="available_from"
            type="time"
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
            {loading ? 'Guardando...' : 'Registrar vehículo'}
          </button>

          {message && (
            <p className="text-sm text-slate-200 pt-2">{message}</p>
          )}
        </form>
      </div>
    </main>
  )
}