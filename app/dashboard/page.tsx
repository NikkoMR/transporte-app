"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserRole = "passenger" | "driver" | "admin";

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarUsuario() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      setEmail(userData.user.email ?? null);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("nombre, role")
        .eq("id", userData.user.id)
        .single();

      if (error) {
        console.error("Error cargando perfil:", error);
        router.push("/login");
        return;
      }

      setNombre(profile.nombre);
      setRole(profile.role);
      setCargando(false);
    }

    cargarUsuario();
  }, [router]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const roleConfig = useMemo(() => {
    switch (role) {
      case "passenger":
        return {
          label: "Pasajero",
          badgeClass:
            "bg-blue-500/15 text-blue-200 border border-blue-400/30",
          title: "Tu transporte al festival",
          subtitle:
            "Solicita tu traslado, revisa el estado de tu viaje y recibe la asignación directamente por WhatsApp.",
        };
      case "driver":
        return {
          label: "Chofer",
          badgeClass:
            "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
          title: "Panel operativo del chofer",
          subtitle:
            "Mantén tu disponibilidad actualizada y revisa los viajes que el sistema te asigne durante el evento.",
        };
      case "admin":
        return {
          label: "Administrador",
          badgeClass:
            "bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/30",
          title: "Centro de control del evento",
          subtitle:
            "Supervisa solicitudes, choferes, vehículos y la operación completa desde un solo lugar.",
        };
      default:
        return {
          label: "Usuario",
          badgeClass:
            "bg-slate-500/15 text-slate-300 border border-slate-500/30",
          title: "Bienvenido",
          subtitle: "Gestiona tu experiencia de transporte.",
        };
    }
  }, [role]);

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-white/10 border-t-yellow-300 animate-spin mb-4" />
          <p className="text-slate-300">Cargando dashboard...</p>
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
        <div className="absolute bottom-16 right-20 w-40 h-40 rounded-full border-4 border-white opacity-[0.06]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute inset-0 bg-[#07111f]/70" />
      </div>

      <section className="relative max-w-6xl mx-auto px-5 py-8 md:px-8 md:py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-[#0d1117] flex items-center justify-center text-2xl font-bold shadow-lg">
              T
            </div>

            <div>
              <p className="text-sm text-slate-300">Transporte App</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Hola{nombre ? `, ${nombre}` : ""}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${roleConfig.badgeClass}`}
            >
              {roleConfig.label}
            </span>

            <Link
              href="/perfil"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition font-semibold"
            >
              Mi perfil
            </Link>

            <button
              onClick={cerrarSesion}
              className="px-4 py-2 rounded-xl bg-red-500/90 hover:bg-red-500 transition font-semibold shadow-lg shadow-red-950/30"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl overflow-hidden mb-8 shadow-2xl shadow-black/30">
          <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-0">
            <div className="p-6 md:p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs text-slate-200 mb-4">
                <span className="w-2 h-2 rounded-full bg-yellow-300" />
                Herederos de la Paz · Transporte oficial
              </div>

              <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
                {roleConfig.title}
              </h2>

              <p className="text-slate-200 text-base md:text-lg leading-relaxed max-w-2xl">
                {roleConfig.subtitle}
              </p>

              <div className="mt-6 text-sm text-slate-300">
                {email && <p>Conectado como: {email}</p>}
              </div>
            </div>

            <div className="border-t lg:border-t-0 lg:border-l border-white/10 p-6 md:p-8 bg-black/10">
              <h3 className="text-lg font-semibold mb-4">Resumen rápido</h3>

              <div className="space-y-3">
                <SummaryItem
                  title="Estado de sesión"
                  value="Activo"
                  valueClass="text-emerald-300"
                />
                <SummaryItem
                  title="Rol actual"
                  value={roleConfig.label}
                  valueClass="text-yellow-200"
                />
                <SummaryItem
                  title="Experiencia"
                  value={
                    role === "passenger"
                      ? "Solicitud y seguimiento"
                      : role === "driver"
                      ? "Operación de viajes"
                      : "Control total"
                  }
                  valueClass="text-slate-100"
                />
              </div>
            </div>
          </div>
        </section>

        {role === "passenger" && (
          <>
            <SectionTitle
              eyebrow="Accesos principales"
              title="Panel del pasajero"
              description="Gestiona tu solicitud, revisa el estado de tu transporte y accede rápidamente a las funciones más importantes."
            />

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
              <ActionCard
                href="/solicitar-transporte"
                title="Solicitar transporte"
                description="Crea una nueva solicitud de traslado en pocos pasos."
                icon="🚗"
                accent="from-blue-500/25 to-cyan-500/10"
              />

              <ActionCard
                href="/mi-transporte"
                title="Mi transporte"
                description="Revisa el estado de tu solicitud y los datos del chofer asignado."
                icon="📍"
                accent="from-emerald-500/25 to-teal-500/10"
              />

              <InfoCard
                title="Notificación por WhatsApp"
                description="Cuando tu viaje sea asignado, recibirás los datos del chofer y la patente."
                icon="💬"
              />
            </div>
          </>
        )}

        {role === "driver" && (
          <>
            <SectionTitle
              eyebrow="Operación"
              title="Panel del chofer"
              description="Mantén tu perfil operativo actualizado y revisa los viajes que te asigne el sistema."
            />

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
              <ActionCard
                href="/conductor"
                title="Mi ficha de chofer"
                description="Actualiza tu disponibilidad, comuna base, patente y capacidad."
                icon="🧾"
                accent="from-emerald-500/25 to-lime-500/10"
              />

              <ActionCard
                href="/conductor"
                title="Mis viajes asignados"
                description="Revisa tus viajes activos y cambia el estado de cada traslado."
                icon="🛣️"
                accent="from-blue-500/25 to-indigo-500/10"
              />

              <InfoCard
                title="Asignación automática"
                description="Si estás disponible y haces match con la comuna, recibirás viajes automáticamente."
                icon="⚡"
              />
            </div>
          </>
        )}

        {role === "admin" && (
          <>
            <SectionTitle
              eyebrow="Control"
              title="Panel administrador"
              description="Supervisa la operación completa del evento, desde solicitudes hasta mapa operativo y choferes."
            />

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
              <ActionCard
                href="/admin"
                title="Panel administración"
                description="Revisa solicitudes, estados y asignaciones."
                icon="🧠"
                accent="from-fuchsia-500/25 to-violet-500/10"
              />

              <ActionCard
                href="/admin/mapa"
                title="Mapa operativo"
                description="Visualiza el movimiento de la operación y sus puntos clave."
                icon="🗺️"
                accent="from-sky-500/25 to-cyan-500/10"
              />

              <ActionCard
                href="/admin/choferes"
                title="Gestionar choferes"
                description="Edita disponibilidad, capacidad, comuna base y datos operativos."
                icon="🚐"
                accent="from-yellow-400/25 to-orange-500/10"
              />
            </div>
          </>
        )}

        <section className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6">
            <h3 className="text-lg font-semibold mb-3">Experiencia festival</h3>
            <p className="text-slate-200 leading-relaxed">
              La app está diseñada para coordinar traslados del evento de forma
              simple, rápida y con notificaciones automáticas por WhatsApp.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6">
            <h3 className="text-lg font-semibold mb-3">Perfil editable</h3>
            <p className="text-slate-200 leading-relaxed">
              Puedes actualizar tu nombre, teléfono y avatar desde{" "}
              <span className="text-yellow-200 font-semibold">Mi perfil</span>.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs uppercase tracking-[0.2em] text-yellow-200 mb-2">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-slate-300 max-w-3xl">{description}</p>
    </div>
  );
}

function SummaryItem({
  title,
  value,
  valueClass = "text-white",
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

function ActionCard({
  href,
  title,
  description,
  icon,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-5 hover:border-white/25 hover:translate-y-[-2px] transition duration-200 shadow-xl shadow-black/20 backdrop-blur-xl`}
    >
      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl mb-4">
        {icon}
      </div>

      <h3 className="text-xl font-semibold mb-2 group-hover:text-white">
        {title}
      </h3>

      <p className="text-slate-300 leading-relaxed">{description}</p>

      <div className="mt-5 text-sm text-yellow-200 font-semibold">
        Ir ahora →
      </div>
    </Link>
  );
}

function InfoCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-5">
      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl mb-4">
        {icon}
      </div>

      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-300 leading-relaxed">{description}</p>
    </div>
  );
}