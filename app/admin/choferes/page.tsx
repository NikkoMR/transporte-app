"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { COMUNAS } from "../../../lib/comunas";

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
  created_at?: string;
};

export default function AdminChoferesPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
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

    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMensaje("No se pudieron cargar los choferes.");
      setLoading(false);
      return;
    }

    setDrivers((data || []) as Driver[]);
    setLoading(false);
  }

  function actualizarLocal(id: string, field: keyof Driver, value: any) {
    setDrivers((prev) =>
      prev.map((driver) =>
        driver.id === id
          ? {
              ...driver,
              [field]: value,
            }
          : driver
      )
    );
  }

  async function guardarChofer(driver: Driver) {
    setGuardandoId(driver.id);
    setMensaje("");

    const { error } = await supabase
      .from("drivers")
      .update({
        nombre: driver.nombre,
        telefono: driver.telefono,
        patente: driver.patente,
        capacidad: driver.capacidad,
        comuna_base: driver.comuna_base,
        activo: driver.activo,
        disponible: driver.disponible,
      })
      .eq("id", driver.id);

    if (error) {
      console.error(error);
      setMensaje("Error al guardar chofer: " + error.message);
      setGuardandoId(null);
      return;
    }

    setMensaje("Chofer actualizado correctamente.");
    setEditandoId(null);
    setGuardandoId(null);
  }

  async function cambiarActivo(driver: Driver) {
    const nuevoValor = !driver.activo;

    const { error } = await supabase
      .from("drivers")
      .update({
        activo: nuevoValor,
      })
      .eq("id", driver.id);

    if (error) {
      setMensaje("Error al cambiar estado activo: " + error.message);
      return;
    }

    actualizarLocal(driver.id, "activo", nuevoValor);
  }

  async function cambiarDisponible(driver: Driver) {
    const nuevoValor = !driver.disponible;

    const { error } = await supabase
      .from("drivers")
      .update({
        disponible: nuevoValor,
      })
      .eq("id", driver.id);

    if (error) {
      setMensaje("Error al cambiar disponibilidad: " + error.message);
      return;
    }

    actualizarLocal(driver.id, "disponible", nuevoValor);
  }

  async function desactivarChofer(driver: Driver) {
    const confirmar = window.confirm(
      `¿Seguro que quieres desactivar a ${driver.nombre}? No se eliminará su historial.`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("drivers")
      .update({
        activo: false,
        disponible: false,
      })
      .eq("id", driver.id);

    if (error) {
      setMensaje("Error al desactivar chofer: " + error.message);
      return;
    }

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driver.id
          ? {
              ...d,
              activo: false,
              disponible: false,
            }
          : d
      )
    );

    setMensaje("Chofer desactivado correctamente.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-white/10 border-t-yellow-300 animate-spin mb-4" />
          <p className="text-slate-300">Cargando choferes...</p>
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

      <section className="relative max-w-7xl mx-auto px-5 py-8 md:py-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-yellow-200 hover:underline mb-6"
        >
          ← Volver al dashboard
        </button>

        <header className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30 mb-8">
          <p className="text-sm uppercase tracking-[0.25em] text-yellow-200 mb-3">
            Administración
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Gestionar choferes
          </h1>

          <p className="text-slate-200 max-w-3xl leading-relaxed">
            Administra la disponibilidad, estado, comuna base, capacidad y datos
            operativos de los choferes del evento.
          </p>
        </header>

        {mensaje && (
          <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-yellow-100 p-4 mb-6">
            {mensaje}
          </div>
        )}

        <section className="grid md:grid-cols-3 gap-4 mb-8">
          <StatCard title="Choferes" value={drivers.length} />
          <StatCard
            title="Activos"
            value={drivers.filter((d) => d.activo).length}
          />
          <StatCard
            title="Disponibles"
            value={drivers.filter((d) => d.activo && d.disponible).length}
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-5 md:p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-2">
                Equipo operativo
              </p>
              <h2 className="text-2xl font-bold">Choferes registrados</h2>
            </div>

            <button
              onClick={cargarDatos}
              className="rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-4 py-2 text-sm font-semibold"
            >
              Actualizar lista
            </button>
          </div>

          {drivers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
              <p className="text-slate-300">
                Todavía no hay choferes registrados.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {drivers.map((driver) => {
                const editando = editandoId === driver.id;

                return (
                  <article
                    key={driver.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                      <div>
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h3 className="text-xl font-bold">{driver.nombre}</h3>
                          <BooleanBadge label="Activo" value={driver.activo} />
                          <BooleanBadge
                            label="Disponible"
                            value={driver.disponible}
                          />
                        </div>

                        <p className="text-sm text-slate-400">
                          {driver.telefono} · {driver.patente || "Sin patente"} ·{" "}
                          {driver.comuna_base || "Sin comuna"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            setEditandoId(editando ? null : driver.id)
                          }
                          className="rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-semibold"
                        >
                          {editando ? "Cancelar edición" : "Editar"}
                        </button>

                        <button
                          onClick={() => cambiarDisponible(driver)}
                          className="rounded-xl border border-emerald-300/30 bg-emerald-400/15 text-emerald-100 px-4 py-2 text-sm font-semibold"
                        >
                          {driver.disponible
                            ? "Marcar no disponible"
                            : "Marcar disponible"}
                        </button>

                        <button
                          onClick={() => cambiarActivo(driver)}
                          className="rounded-xl border border-blue-300/30 bg-blue-400/15 text-blue-100 px-4 py-2 text-sm font-semibold"
                        >
                          {driver.activo ? "Desactivar" : "Activar"}
                        </button>

                        <button
                          onClick={() => desactivarChofer(driver)}
                          className="rounded-xl border border-red-300/30 bg-red-400/15 text-red-100 px-4 py-2 text-sm font-semibold"
                        >
                          Bloquear
                        </button>
                      </div>
                    </div>

                    {editando ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Field label="Nombre">
                          <input
                            className="input-festival"
                            value={driver.nombre}
                            onChange={(e) =>
                              actualizarLocal(
                                driver.id,
                                "nombre",
                                e.target.value
                              )
                            }
                          />
                        </Field>

                        <Field label="Teléfono">
                          <input
                            className="input-festival"
                            value={driver.telefono}
                            onChange={(e) =>
                              actualizarLocal(
                                driver.id,
                                "telefono",
                                e.target.value
                              )
                            }
                          />
                        </Field>

                        <Field label="Patente">
                          <input
                            className="input-festival"
                            value={driver.patente || ""}
                            onChange={(e) =>
                              actualizarLocal(
                                driver.id,
                                "patente",
                                e.target.value.toUpperCase()
                              )
                            }
                          />
                        </Field>

                        <Field label="Capacidad">
                          <input
                            type="number"
                            min="1"
                            className="input-festival"
                            value={driver.capacidad}
                            onChange={(e) =>
                              actualizarLocal(
                                driver.id,
                                "capacidad",
                                Number(e.target.value)
                              )
                            }
                          />
                        </Field>

                        <Field label="Comuna base">
                          <select
                            className="input-festival"
                            value={driver.comuna_base || ""}
                            onChange={(e) =>
                              actualizarLocal(
                                driver.id,
                                "comuna_base",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Selecciona comuna</option>
                            {COMUNAS.map((comuna) => (
                              <option key={comuna} value={comuna}>
                                {comuna}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <div className="flex items-end">
                          <button
                            onClick={() => guardarChofer(driver)}
                            disabled={guardandoId === driver.id}
                            className="w-full rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] px-4 py-3 font-bold transition disabled:opacity-60"
                          >
                            {guardandoId === driver.id
                              ? "Guardando..."
                              : "Guardar cambios"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <InfoItem
                          title="Teléfono"
                          value={driver.telefono || "Sin teléfono"}
                        />
                        <InfoItem
                          title="Patente"
                          value={driver.patente || "Sin patente"}
                        />
                        <InfoItem
                          title="Capacidad"
                          value={`${driver.capacidad} pasajeros`}
                        />
                        <InfoItem
                          title="Comuna base"
                          value={driver.comuna_base || "Sin comuna"}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
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
      `}</style>
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

function BooleanBadge({ label, value }: { label: string; value: boolean }) {
  return value ? (
    <span className="px-3 py-1 rounded-full border text-xs font-semibold bg-emerald-400/15 text-emerald-200 border-emerald-400/30">
      {label}: Sí
    </span>
  ) : (
    <span className="px-3 py-1 rounded-full border text-xs font-semibold bg-red-400/15 text-red-200 border-red-400/30">
      {label}: No
    </span>
  );
}

function InfoItem({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
        {title}
      </p>
      <p className="font-semibold text-slate-100 break-words">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2 text-slate-200">
        {label}
      </label>
      {children}
    </div>
  );
}