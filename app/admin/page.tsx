import { supabase } from '@/lib/supabase'

async function getRequests() {
  const { data, error } = await supabase
    .from('transport_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return data
}

export default async function AdminPage() {
  const requests = await getRequests()

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Panel de solicitudes</h1>

        <table className="w-full border border-slate-800 bg-slate-900 rounded-xl overflow-hidden">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Teléfono</th>
              <th className="p-3 text-left">Recogida</th>
              <th className="p-3 text-left">Destino</th>
              <th className="p-3 text-left">Pasajeros</th>
              <th className="p-3 text-left">Estado</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-3">{r.full_name}</td>
                <td className="p-3">{r.phone}</td>
                <td className="p-3">{r.pickup_address}</td>
                <td className="p-3">{r.destination_address}</td>
                <td className="p-3">{r.passenger_count}</td>
                <td className="p-3">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}