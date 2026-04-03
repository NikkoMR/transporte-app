'use client'

import { useState } from 'react'

const COMUNAS = [
  'SANTIAGO',
  'LAS CONDES',
  'VITACURA',
  'LO BARNECHEA',
  'PROVIDENCIA',
  'MAIPÚ',
  'PUENTE ALTO',
  'LA FLORIDA',
  'ÑUÑOA',
  'SAN MIGUEL',
  'LA CISTERNA',
  'QUILICURA',
  'RENCA',
  'INDEPENDENCIA',
  'RECOLETA',
  'ESTACIÓN CENTRAL',
  'QUINTA NORMAL',
  'CERRO NAVIA',
]

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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target

    setForm((prev) => {
      const next = { ...prev, [name]: value }

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
      const res = await fetch('/api/registervehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          capacity_total: Number(form.capacity_total),
          capacity_available: Number(form.capacity_available),
        }),
      })

      let data

      try {
        data = await res.json()
      } catch {
        const text = await res.text()
        console.error(text)
        setMessage('Error servidor (no JSON)')
        return
      }

      if (!res.ok) {
        setMessage(data.error || 'Error')
      } else {
        setMessage(data.message || 'OK')
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
      }
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <h1 className="text-3xl font-bold mb-6">Registro de vehículo</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <input
          name="driver_name"
          placeholder="Nombre"
          value={form.driver_name}
          onChange={handleChange}
          required
          className="input"
        />

        <input
          name="driver_phone"
          placeholder="Teléfono"
          value={form.driver_phone}
          onChange={handleChange}
          required
          className="input"
        />

        <input
          name="plate"
          placeholder="Patente"
          value={form.plate}
          onChange={handleChange}
          required
          className="input"
        />

        <input
          name="vehicle_model"
          placeholder="Vehículo"
          value={form.vehicle_model}
          onChange={handleChange}
          className="input"
        />

        <div className="flex gap-2">
          <input
            name="capacity_total"
            placeholder="Total"
            value={form.capacity_total}
            onChange={handleChange}
            className="input"
          />

          <input
            name="capacity_available"
            placeholder="Disponible"
            value={form.capacity_available}
            onChange={handleChange}
            className="input"
          />
        </div>

        <select
          name="current_zone"
          value={form.current_zone}
          onChange={handleChange}
          className="input"
          required
        >
          <option value="">Selecciona comuna</option>
          {COMUNAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button disabled={loading} className="bg-green-500 px-4 py-2 rounded">
          {loading ? 'Guardando...' : 'Registrar vehículo'}
        </button>

        {message && <p>{message}</p>}
      </form>
    </main>
  )
}