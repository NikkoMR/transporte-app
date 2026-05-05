"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { COMUNAS } from "../../lib/comunas";

type AssignedTrip = {
  id: string;
  full_name: string;
  phone: string;
  pickup_address: string;
  pickup_zone: string;
  destination_address: string;
  trip_date: string;
  requested_time: string;
  passenger_count: number;
  notes: string | null;
  status: string;
  assigned_driver_id: string | null;
};

export default function ConductorPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [patente, setPatente] = useState("");
  const [capacidad, setCapacidad] = useState(4);
  const [comunaBase, setComunaBase] = useState("");
  const [disponible, setDisponible] = useState(true);

  const [trips, setTrips] = useState<AssignedTrip[]>([]);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [actualizandoViaje, setActualizandoViaje] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("nombre, role")
        .eq("id", userData.user.id)
        .single();

      if (profileError || profile?.role !== "driver") {
        router.push("/dashboard");
        return;
      }

      setUserId(userData.user.id);
      setNombre(profile.nombre ?? "");

      const { data: driver } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (driver) {
        setDriverId(driver.id);
        setNombre(driver.nombre ?? profile.nombre ?? "");
        setTelefono(driver.telefono ?? "");
        setPatente(driver.patente ?? "");
        setCapacidad(driver.capacidad ?? 4);
        setComunaBase(driver.comuna_base ?? "");
        setDisponible(driver.disponible ?? true);

        await cargarViajes(driver.id);
      }

      setLoading(false);
    }

    cargarDatos();
  }, [router]);

  async function cargarViajes(currentDriverId: string) {
    const { data, error } = await supabase
      .from("transport_requests")
      .select("*")
      .eq("assigned_driver_id", currentDriverId)
      .in("status", ["asignado", "en_camino", "recogido"])
      .order("trip_date", { ascending: true })
      .order("requested_time", { ascending: true });

    if (error) {
      console.error(error);
      setMensaje("No se pudieron cargar los viajes asignados.");
      return;
    }

    setTrips((data || []) as AssignedTrip[]);
  }

  async function guardarFicha(e: React.FormEvent) {
    e.preventDefault();

    if (!userId) return;

    if (!nombre || !telefono || !comunaBase) {
      setMensaje("Completa nombre, teléfono y comuna base.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    const datosChofer = {
      user_id: userId,
      nombre,
      telefono,
      patente,
      capacidad,
      comuna_base: comunaBase,
      disponible,
      activo: true,
    };

    if (driverId) {
      const { error } = await supabase
        .from("drivers")
        .update(datosChofer)
        .eq("id", driverId);

      if (error) {
        setMensaje("Error al actualizar ficha: " + error.message);
        setGuardando(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("drivers")
        .insert(datosChofer)
        .select("id")
        .single();

      if (error) {
        setMensaje("Error al crear ficha: " + error.message);
        setGuardando(false);
        return;
      }

      setDriverId(data.id);
      await cargarViajes(data.id);
    }

    setMensaje("Ficha de chofer guardada correctamente.");
    setGuardando(false);
  }

  async function cambiarEstadoViaje(tripId: string, nuevoEstado: string) {
    if (!driverId) return;

    setActualizandoViaje(tripId);
    setMensaje("");

    const { error: tripError } = await supabase
      .from("transport_requests")
      .update({
        status: nuevoEstado,
      })
      .eq("id", tripId)
      .eq("assigned_driver_id", driverId);

    if (tripError) {
      console.error(tripError);
      setMensaje("Error al actualizar viaje: " + tripError.message);
      setActualizandoViaje(null);
      return;
    }

    if (nuevoEstado === "finalizado") {
      const { error: driverError } = await supabase
        .from("drivers")
        .update({
          disponible: true,
        })
        .eq("id", driverId);

      if (driverError) {
        console.error(driverError);
        setMensaje(
          "El viaje se finalizó, pero no se pudo liberar el chofer: " +
            driverError.message
        );
        setActualizandoViaje(null);
        return;
      }

      setDisponible(true);
      setMensaje("Viaje finalizado. Ahora estás disponible nuevamente.");
    } else {
      setMensaje("Estado del viaje actualizado correctamente.");
    }

    await cargarViajes(driverId);
    setActualizandoViaje(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-white/10 border-t-yellow-300 animate-spin mb-4" />
          <p className="text-slate-300">Cargando ficha de chofer...</p>
        </div>
      </main>
    );
  }

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

      <section className="relative max-w-6xl mx-auto px-5 py-8 md:py-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-yellow-200 hover:underline mb-6"
        >
          ← Volver al dashboard
        </button>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-start mb-8">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30">
            <div className="w-16 h-16 rounded-2xl bg-white text-[#0d1117] flex items-center justify-center text-3xl font-bold shadow-lg mb-5">
              T
            </div>

            <p className="text-sm uppercase tracking-[0.25em] text-yellow-200 mb-3">
              Herederos de la Paz
            </p>

            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
              Panel operativo del chofer
            </h1>

            <p className="text-slate-200 leading-relaxed mb-6">
              Actualiza tu disponibilidad, revisa tus viajes asignados y cambia
              el estado de cada traslado.
            </p>

            <div className="space-y-3">
              <InfoItem
                title="Estado actual"
                value={disponible ? "Disponible" : "Ocupado / no disponible"}
                valueClass={disponible ? "text-emerald-300" : "text-red-300"}
              />
              <InfoItem
                title="Comuna base"
                value={comunaBase || "Sin configurar"}
                valueClass="text-yellow-200"
              />
              <InfoItem
                title="Viajes activos"
                value={`${trips.length}`}
                valueClass="text-slate-100"
              />
            </div>
          </aside>

          <form
            onSubmit={guardarFicha}
            className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30"
          >
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-2">
                Datos del chofer
              </p>

              <h2 className="text-2xl font-bold mb-2">
                Información de operación
              </h2>

              <p className="text-slate-300">
                Estos datos se usarán para asignarte pasajeros automáticamente.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-festival">Nombre</label>
                <input
                  className="input-festival"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del chofer"
                  required
                />
              </div>

              <div>
                <label className="label-festival">Teléfono / WhatsApp</label>
                <input
                  className="input-festival"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+56912345678"
                  required
                />
              </div>

              <div>
                <label className="label-festival">Patente</label>
                <input
                  className="input-festival"
                  value={patente}
                  onChange={(e) => setPatente(e.target.value.toUpperCase())}
                  placeholder="ABCD12"
                />
              </div>

              <div>
                <label className="label-festival">
                  Capacidad de pasajeros
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-festival"
                  value={capacidad}
                  onChange={(e) => setCapacidad(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="label-festival">Comuna base</label>
                <select
                  className="input-festival"
                  value={comunaBase}
                  onChange={(e) => setComunaBase(e.target.value)}
                  required
                >
                  <option value="">Selecciona comuna base</option>
                  {COMUNAS.map((comuna) => (
                    <option key={comuna} value={comuna}>
                      {comuna}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm">
                <input
                  type="checkbox"
                  checked={disponible}
                  onChange={(e) => setDisponible(e.target.checked)}
                  className="h-4 w-4"
                />
                <span>
                  Estoy disponible para recibir viajes
                  <span className="block text-xs text-slate-400 mt-1">
                    Si desactivas esta opción, el sistema no te asignará nuevos
                    pasajeros.
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={guardando}
                className="w-full rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] py-3 font-bold transition shadow-lg shadow-yellow-950/20 disabled:opacity-60"
              >
                {guardando ? "Guardando ficha..." : "Guardar ficha"}
              </button>
            </div>
          </form>
        </div>

        {mensaje && (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mb-8">
            <p className="text-sm text-slate-100">{mensaje}</p>
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-2">
                Viajes
              </p>
              <h2 className="text-2xl font-bold">Mis viajes asignados</h2>
              <p className="text-slate-300 mt-2">
                Cambia el estado del traslado a medida que avanza la operación.
              </p>
            </div>

            {driverId && (
              <button
                onClick={() => cargarViajes(driverId)}
                className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-4 py-2 text-sm font-semibold"
              >
                Actualizar lista
              </button>
            )}
          </div>

          {trips.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
              <p className="text-slate-300">
                No tienes viajes asignados activos por ahora.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  updating={actualizandoViaje === trip.id}
                  onChangeStatus={cambiarEstadoViaje}
                />
              ))}
            </div>
          )}
        </section>
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

        .label-festival {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: rgb(226 232 240);
        }
      `}</style>
    </main>
  );
}

function TripCard({
  trip,
  updating,
  onChangeStatus,
}: {
  trip: AssignedTrip;
  updating: boolean;
  onChangeStatus: (tripId: string, status: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h3 className="text-xl font-bold">{trip.full_name}</h3>
            <StatusBadge status={trip.status} />
          </div>

          <p className="text-slate-300 text-sm">
            {trip.trip_date} · {trip.requested_time} · {trip.passenger_count} pasajeros
          </p>
        </div>

        <a
          href={`tel:${trip.phone}`}
          className="rounded-xl bg-yellow-300 text-[#111827] px-4 py-2 text-sm font-bold text-center"
        >
          Llamar pasajero
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-4 text-sm mb-5">
        <DetailItem title="Teléfono" value={trip.phone} />
        <DetailItem title="Comuna" value={trip.pickup_zone} />
        <DetailItem title="Recogida" value={trip.pickup_address} />
        <DetailItem title="Destino" value={trip.destination_address} />
        {trip.notes && <DetailItem title="Notas" value={trip.notes} />}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={updating || trip.status === "en_camino"}
          onClick={() => onChangeStatus(trip.id, "en_camino")}
          className="rounded-xl border border-blue-300/30 bg-blue-400/15 text-blue-100 px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          En camino
        </button>

        <button
          disabled={updating || trip.status === "recogido"}
          onClick={() => onChangeStatus(trip.id, "recogido")}
          className="rounded-xl border border-emerald-300/30 bg-emerald-400/15 text-emerald-100 px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Pasajero recogido
        </button>

        <button
          disabled={updating}
          onClick={() => onChangeStatus(trip.id, "finalizado")}
          className="rounded-xl border border-yellow-300/30 bg-yellow-300/90 text-[#111827] px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          Finalizar viaje
        </button>
      </div>
    </article>
  );
}

function DetailItem({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
        {title}
      </p>
      <p className="text-slate-100">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase();

  const style =
    normalized === "asignado"
      ? "bg-yellow-400/15 text-yellow-200 border-yellow-400/30"
      : normalized === "en_camino"
      ? "bg-blue-400/15 text-blue-200 border-blue-400/30"
      : normalized === "recogido"
      ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/30"
      : "bg-slate-400/15 text-slate-200 border-slate-400/30";

  return (
    <span
      className={`px-3 py-1 rounded-full border text-xs font-semibold ${style}`}
    >
      {status || "sin estado"}
    </span>
  );
}

function InfoItem({
  title,
  value,
  valueClass = "text-slate-100",
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
        {title}
      </p>
      <p className={`font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}