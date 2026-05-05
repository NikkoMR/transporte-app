"use client";

import { useState } from "react";
import { COMUNAS } from "../../lib/comunas";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SolicitarTransportePage() {
  const router = useRouter();

  const EVENT_DATE = "2026-07-20";
  const EVENT_TIME = "15:30";

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    pickup_address: "",
    pickup_zone: "",
    destination_address: "",
    trip_date: EVENT_DATE,
    requested_time: EVENT_TIME,
    passenger_count: 1,
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "passenger_count" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("/api/create-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          passenger_user_id: userData.user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Error al enviar la solicitud");
        setLoading(false);
        return;
      }

      if (result.assigned) {
        setMessage(
          "¡Solicitud enviada! Tu transporte fue asignado y recibirás la información por WhatsApp."
        );
      } else {
        setMessage(
          "¡Solicitud enviada! Quedó pendiente mientras se asigna un chofer disponible."
        );
      }

      setForm({
        full_name: "",
        phone: "",
        pickup_address: "",
        pickup_zone: "",
        destination_address: "",
        trip_date: EVENT_DATE,
        requested_time: EVENT_TIME,
        passenger_count: 1,
        notes: "",
      });

      setTimeout(() => {
        router.push("/mi-transporte");
      }, 1200);
    } catch (error) {
      console.error(error);
      setMessage("Error al enviar la solicitud");
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#07111f] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 w-72 h-72 rounded-[40%] bg-[#8b5cf6] opacity-70 blur-[2px]" />
        <div className="absolute -top-12 left-36 w-80 h-44 rounded-[45%] bg-[#06b6d4] opacity-60 blur-[2px]" />
        <div className="absolute -top-10 right-0 w-80 h-44 rounded-[35%] bg-[#facc15] opacity-80 blur-[2px]" />
        <div className="absolute top-28 -right-12 w-48 h-80 rounded-[40%] bg-[#ff4fa3] opacity-70 blur-[2px]" />
        <div className="absolute bottom-0 left-0 w-80 h-36 rounded-tr-[90px] rounded-tl-[40px] bg-[#14b8a6] opacity-70 blur-[2px]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute inset-0 bg-[#07111f]/70" />
      </div>

      <section className="relative max-w-5xl mx-auto px-5 py-8 md:py-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-yellow-200 hover:underline mb-6"
        >
          ← Volver al dashboard
        </button>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-start">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30">
            <div className="w-16 h-16 rounded-2xl bg-white text-[#0d1117] flex items-center justify-center text-3xl font-bold shadow-lg mb-5">
              T
            </div>

            <p className="text-sm uppercase tracking-[0.25em] text-yellow-200 mb-3">
              Herederos de la Paz
            </p>

            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
              Solicita tu transporte al festival
            </h1>

            <p className="text-slate-200 leading-relaxed mb-6">
              Completa tus datos de recogida. El sistema buscará un chofer
              disponible según tu comuna y te notificará por WhatsApp cuando el
              traslado sea asignado.
            </p>

            <div className="space-y-3">
              <InfoItem title="Destino del evento" value="Barrio Bellavista" />
              <InfoItem title="Fecha del evento" value="20 de julio" />
              <InfoItem title="Hora de cita" value="15:30 hrs" />
              <InfoItem title="Asignación" value="Automática por comuna" />
              <InfoItem title="Notificación" value="WhatsApp al pasajero" />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-semibold mb-2">Importante</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                La solicitud considera la fecha y hora oficial del evento. Solo
                debes indicar desde dónde necesitas que coordinemos la recogida.
              </p>
            </div>
          </aside>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30"
          >
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-2">
                Datos del pasajero
              </p>

              <h2 className="text-2xl font-bold mb-2">
                Información del traslado
              </h2>

              <p className="text-slate-300">
                Ingresa tus datos para coordinar la recogida.
              </p>
            </div>

            <div className="space-y-4">
              <input
                name="full_name"
                placeholder="Nombre completo"
                value={form.full_name}
                onChange={handleChange}
                className="input-festival"
                required
              />

              <input
                name="phone"
                placeholder="Teléfono / WhatsApp"
                value={form.phone}
                onChange={handleChange}
                className="input-festival"
                required
              />

              <input
                name="pickup_address"
                placeholder="Dirección exacta de recogida"
                value={form.pickup_address}
                onChange={handleChange}
                className="input-festival"
                required
              />

              <select
                name="pickup_zone"
                value={form.pickup_zone}
                onChange={handleChange}
                className="input-festival"
                required
              >
                <option value="">Selecciona comuna de recogida</option>
                {COMUNAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                name="destination_address"
                value={form.destination_address}
                onChange={handleChange}
                className="input-festival"
                required
              >
                <option value="">Selecciona destino del evento</option>
                <option value="Mallinkrodt 112 (Teatro), Barrio Bellavista, Providencia, Santiago, Chile">
                  Mallinkrodt 112 - Teatro
                </option>
                <option value="Mallinkrodt 76 (Centro Cultural), Barrio Bellavista, Providencia, Santiago, Chile">
                  Mallinkrodt 76 - Centro Cultural
                </option>
              </select>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                  Horario del evento
                </p>

                <p className="text-slate-100 font-semibold">
                  20 de julio · Hora de cita 15:30 hrs
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  No necesitas ingresar fecha ni hora. La coordinación se hará
                  considerando el horario oficial del festival.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-200">
                  ¿Cuántas personas viajan contigo?
                </label>

                <select
                  name="passenger_count"
                  value={form.passenger_count}
                  onChange={handleChange}
                  className="input-festival"
                  required
                >
                  <option value={1}>Solo yo</option>
                  <option value={2}>2 personas</option>
                  <option value={3}>3 personas</option>
                  <option value={4}>4 personas</option>
                  <option value={5}>5 personas</option>
                </select>

                <p className="text-xs text-slate-400 mt-2">
                  Usa este campo solo si viajas con acompañantes desde el mismo
                  punto de recogida.
                </p>
              </div>

              <textarea
                name="notes"
                placeholder="Observaciones opcionales"
                value={form.notes}
                onChange={handleChange}
                className="input-festival min-h-28 resize-none"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] py-3 font-bold transition shadow-lg shadow-yellow-950/20 disabled:opacity-60"
              >
                {loading ? "Enviando solicitud..." : "Enviar solicitud"}
              </button>

              {message && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-slate-100">{message}</p>
                </div>
              )}
            </div>
          </form>
        </div>
      </section>

      <style jsx global>{`
        .input-festival {
          width: 100%;
          border-radius: 0.9rem;
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.85rem 1rem;
          color: white;
          outline: none;
        }

        .input-festival::placeholder {
          color: rgb(148 163 184);
        }

        .input-festival:focus {
          border-color: #facc15;
        }

        .input-festival option {
          background: #07111f;
          color: white;
        }
      `}</style>
    </main>
  );
}

function InfoItem({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
        {title}
      </p>
      <p className="font-semibold text-slate-100">{value}</p>
    </div>
  );
}