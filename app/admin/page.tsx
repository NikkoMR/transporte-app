"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type TransportRequest = {
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
  created_at?: string;
};

type Driver = {
  id: string;
  user_id: string;
  nombre: string;
  telefono: string;
  patente: string | null;
  capacidad: number;
  comuna_base: string | null;
  activo: boolean;
  disponible: boolean;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarAdmin() {
      setLoading(true);
      setMensaje("");

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const { data: requestsData, error: requestsError } = await supabase
        .from("transport_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) {
        console.error(requestsError);
        setMensaje(
          "No se pudieron cargar las solicitudes. Revisa permisos RLS de transport_requests."
        );
      } else {
        setRequests((requestsData || []) as TransportRequest[]);
      }

      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

      if (driversError) {
        console.error(driversError);
        setMensaje(
          "No se pudieron cargar los choferes. Revisa permisos RLS de drivers."
        );
      } else {
        setDrivers((driversData || []) as Driver[]);
      }

      setLoading(false);
    }

    cargarAdmin();
  }, [router]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pendientes = requests.filter((r) => r.status === "pendiente").length;
    const asignadas = requests.filter((r) => r.status === "asignado").length;
    const finalizadas = requests.filter((r) => r.status === "finalizado").length;
    const disponibles = drivers.filter((d) => d.disponible && d.activo).length;

    return {
      total,
      pendientes,
      asignadas,
      finalizadas,
      disponibles,
    };
  }, [requests, drivers]);

  function getDriverName(driverId: string | null) {
    if (!driverId) return "Sin asignar";

    const driver = drivers.find((d) => d.id === driverId);
    return driver ? driver.nombre : "Chofer no encontrado";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-white/10 border-t-yellow-300 animate-spin mb-4" />
          <p className="text-slate-300">Cargando panel admin...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white relative overflow-hidden">
      {/* Fondo estilo festival */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 w-72 h-72 rounded-[40%] bg-[#8b5cf6] opacity-70 blur-[2px]" />
        <div className="absolute -top-12 left-36 w-80 h-44 rounded-[45%] bg-[#06b6d4] opacity-60 blur-[2px]" />
        <div className="absolute -top-10 right-0 w-80 h-44 rounded-[35%] bg-[#facc15] opacity-80 blur-[2px]" />
        <div className="absolute top-28 -right-12 w-48 h-80 rounded-[40%] bg-[#ff4fa3] opacity-70 blur-[2px]" />
        <div className="absolute bottom-0 left-0 w-80 h-36 rounded-tr-[90px] rounded-tl-[40px] bg-[#14b8a6] opacity-70 blur-[2px]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute inset-0 bg-[#07111f]/70" />
      </div>

      <section className="relative max-w-7xl mx-auto px-5 py-8 md:py-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-yellow-200 hover:underline mb-6"
        >
          ← Volver al dashboard
        </button>

        <header className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30 mb-8">
          <p className="text-sm uppercase tracking-[0.25em] text-yellow-200 mb-3">
            Centro de control
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Panel administrador
          </h1>

          <p className="text-slate-200 max-w-3xl leading-relaxed">
            Supervisa solicitudes, choferes disponibles y asignaciones del
            evento. Esta vista será el respaldo manual cuando la automatización
            necesite ajustes.
          </p>
        </header>

        {mensaje && (
          <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-yellow-100 p-4 mb-6">
            {mensaje}
          </div>
        )}

        {/* Métricas */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard title="Solicitudes" value={stats.total} />
          <StatCard title="Pendientes" value={stats.pendientes} />
          <StatCard title="Asignadas" value={stats.asignadas} />
          <StatCard title="Finalizadas" value={stats.finalizadas} />
          <StatCard title="Choferes disp." value={stats.disponibles} />
        </section>

        {/* Solicitudes */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-5 md:p-6 shadow-2xl shadow-black/30 mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-2">
                Operación
              </p>
              <h2 className="text-2xl font-bold">Solicitudes de transporte</h2>
            </div>

            <p className="text-sm text-slate-300">
              Últimas solicitudes recibidas
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-white/10">
                  <th className="py-3 pr-4">Pasajero</th>
                  <th className="py-3 pr-4">Teléfono</th>
                  <th className="py-3 pr-4">Comuna</th>
                  <th className="py-3 pr-4">Recogida</th>
                  <th className="py-3 pr-4">Destino</th>
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="py-3 pr-4">Hora</th>
                  <th className="py-3 pr-4">Pax</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Chofer</th>
                </tr>
              </thead>

              <tbody>
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No hay solicitudes registradas.
                    </td>
                  </tr>
                )}

                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-white/5 text-slate-200"
                  >
                    <td className="py-3 pr-4 font-medium">
                      {request.full_name}
                    </td>
                    <td className="py-3 pr-4">{request.phone}</td>
                    <td className="py-3 pr-4">{request.pickup_zone}</td>
                    <td className="py-3 pr-4 max-w-[220px] truncate">
                      {request.pickup_address}
                    </td>
                    <td className="py-3 pr-4 max-w-[220px] truncate">
                      {request.destination_address}
                    </td>
                    <td className="py-3 pr-4">{request.trip_date}</td>
                    <td className="py-3 pr-4">{request.requested_time}</td>
                    <td className="py-3 pr-4">{request.passenger_count}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="py-3 pr-4">
                      {getDriverName(request.assigned_driver_id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Choferes */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-5 md:p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-2">
                Equipo
              </p>
              <h2 className="text-2xl font-bold">Choferes registrados</h2>
            </div>

            <p className="text-sm text-slate-300">
              Disponibilidad y capacidad operativa
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-white/10">
                  <th className="py-3 pr-4">Chofer</th>
                  <th className="py-3 pr-4">Teléfono</th>
                  <th className="py-3 pr-4">Patente</th>
                  <th className="py-3 pr-4">Capacidad</th>
                  <th className="py-3 pr-4">Comuna base</th>
                  <th className="py-3 pr-4">Disponible</th>
                  <th className="py-3 pr-4">Activo</th>
                </tr>
              </thead>

              <tbody>
                {drivers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No hay choferes registrados.
                    </td>
                  </tr>
                )}

                {drivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="border-b border-white/5 text-slate-200"
                  >
                    <td className="py-3 pr-4 font-medium">{driver.nombre}</td>
                    <td className="py-3 pr-4">{driver.telefono}</td>
                    <td className="py-3 pr-4">
                      {driver.patente || "Sin patente"}
                    </td>
                    <td className="py-3 pr-4">{driver.capacidad}</td>
                    <td className="py-3 pr-4">
                      {driver.comuna_base || "Sin comuna"}
                    </td>
                    <td className="py-3 pr-4">
                      <BooleanBadge value={driver.disponible} />
                    </td>
                    <td className="py-3 pr-4">
                      <BooleanBadge value={driver.activo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-5 shadow-xl shadow-black/20">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
        {title}
      </p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase();

  const style =
    normalized === "asignado"
      ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/30"
      : normalized === "pendiente"
      ? "bg-yellow-400/15 text-yellow-200 border-yellow-400/30"
      : normalized === "finalizado"
      ? "bg-blue-400/15 text-blue-200 border-blue-400/30"
      : normalized === "cancelado"
      ? "bg-red-400/15 text-red-200 border-red-400/30"
      : "bg-slate-400/15 text-slate-200 border-slate-400/30";

  return (
    <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${style}`}>
      {status || "sin estado"}
    </span>
  );
}

function BooleanBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="px-3 py-1 rounded-full border text-xs font-semibold bg-emerald-400/15 text-emerald-200 border-emerald-400/30">
      Sí
    </span>
  ) : (
    <span className="px-3 py-1 rounded-full border text-xs font-semibold bg-red-400/15 text-red-200 border-red-400/30">
      No
    </span>
  );
}