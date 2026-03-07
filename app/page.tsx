'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    pickup_address: '',
    pickup_zone: '',
    destination_address: '',
    trip_date: '',
    requested_time: '',
    passenger_count: 1,
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
      [name]: name === 'passenger_count' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.from('transport_requests').insert([
      {
        ...form,
        status: 'pendiente',
      },
    ])

    if (error) {
      setMessage('Error al guardar la solicitud')
      console.error(error)
    } else {
      setMessage('Solicitud enviada correctamente')
      setForm({
        full_name: '',
        phone: '',
        pickup_address: '',
        pickup_zone: '',
        destination_address: '',
        trip_date: '',
        requested_time: '',
        passenger_count: 1,
        notes: '',
      })
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Solicitud de transporte</h1>
        <p className="text-slate-300 mb-8">
          Completa este formulario para pedir cupo de transporte.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-slate-900 p-6 rounded-2xl border border-slate-800"
        >
          <input
            name="full_name"
            placeholder="Nombre completo"
            value={form.full_name}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            required
          />

          <input
            name="phone"
            placeholder="Teléfono"
            value={form.phone}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            required
          />

          <input
            name="pickup_address"
            placeholder="Dirección de recogida"
            value={form.pickup_address}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            required
          />

          <input
            name="pickup_zone"
            placeholder="Comuna o zona"
            value={form.pickup_zone}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
          />

          <input
            name="destination_address"
            placeholder="Dirección de destino"
            value={form.destination_address}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="date"
              name="trip_date"
              value={form.trip_date}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
              required
            />

            <input
              type="time"
              name="requested_time"
              value={form.requested_time}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
              required
            />
          </div>

          <input
            type="number"
            name="passenger_count"
            min="1"
            value={form.passenger_count}
            onChange={handleChange}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
            required
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
            className="w-full rounded-lg bg-green-600 hover:bg-green-500 transition px-4 py-3 font-semibold disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </button>

          {message && <p className="text-sm text-slate-200 pt-2">{message}</p>}
        </form>
      </div>
    </main>
  )
}