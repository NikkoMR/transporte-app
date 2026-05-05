"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function PerfilPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("🙂");
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const emojis = ["🙂", "😎", "🚗", "🎭", "🎵", "⭐", "🌈", "🔥", "💚", "💛"];

  useEffect(() => {
    async function cargarPerfil() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      setUserId(userData.user.id);
      setEmail(userData.user.email ?? "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("nombre, telefono, avatar_emoji, role")
        .eq("id", userData.user.id)
        .single();

      if (error) {
        console.error(error);
        setMensaje("No se pudo cargar tu perfil.");
        setLoading(false);
        return;
      }

      setNombre(profile.nombre ?? "");
      setTelefono(profile.telefono ?? "");
      setAvatarEmoji(profile.avatar_emoji ?? "🙂");
      setRole(profile.role ?? "");

      setLoading(false);
    }

    cargarPerfil();
  }, [router]);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();

    if (!userId) return;

    if (!nombre) {
      setMensaje("El nombre es obligatorio.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    const { error } = await supabase
      .from("profiles")
      .update({
        nombre,
        telefono,
        avatar_emoji: avatarEmoji,
      })
      .eq("id", userId);

    if (error) {
      console.error(error);
      setMensaje("Error al guardar perfil: " + error.message);
      setGuardando(false);
      return;
    }

    setMensaje("Perfil actualizado correctamente.");
    setGuardando(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-white/10 border-t-yellow-300 animate-spin mb-4" />
          <p className="text-slate-300">Cargando perfil...</p>
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

      <section className="relative max-w-4xl mx-auto px-5 py-8 md:py-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-yellow-200 hover:underline mb-6"
        >
          ← Volver al dashboard
        </button>

        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-8 items-start">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30">
            <div className="w-24 h-24 rounded-3xl bg-white text-[#0d1117] flex items-center justify-center text-5xl shadow-lg mb-5">
              {avatarEmoji}
            </div>

            <p className="text-sm uppercase tracking-[0.25em] text-yellow-200 mb-3">
              Mi perfil
            </p>

            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
              {nombre || "Usuario"}
            </h1>

            <div className="space-y-3">
              <InfoItem title="Correo" value={email} />
              <InfoItem title="Teléfono" value={telefono || "Sin teléfono"} />
              <InfoItem title="Rol" value={role || "Sin rol"} />
            </div>

            <p className="text-sm text-slate-300 mt-6 leading-relaxed">
              Estos datos se usarán para personalizar tu experiencia dentro de
              la app de transporte del evento.
            </p>
          </aside>

          <form
            onSubmit={guardarPerfil}
            className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30"
          >
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-2">
                Editar datos
              </p>

              <h2 className="text-2xl font-bold mb-2">
                Información personal
              </h2>

              <p className="text-slate-300">
                Actualiza tu nombre, teléfono y avatar para identificarte mejor.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-festival">Avatar</label>

                <div className="grid grid-cols-5 gap-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarEmoji(emoji)}
                      className={`h-12 rounded-2xl text-2xl border transition ${
                        avatarEmoji === emoji
                          ? "bg-yellow-300 text-[#111827] border-yellow-300"
                          : "bg-black/20 border-white/10 hover:bg-black/30"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-festival">Nombre</label>
                <input
                  className="input-festival"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
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
                />
              </div>

              <div>
                <label className="label-festival">Correo</label>
                <input
                  className="input-festival opacity-60 cursor-not-allowed"
                  value={email}
                  disabled
                />
                <p className="text-xs text-slate-400 mt-2">
                  El correo está asociado al inicio de sesión y no se edita desde aquí.
                </p>
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] py-3 font-bold transition shadow-lg shadow-yellow-950/20 disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>

              {mensaje && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-slate-100">{mensaje}</p>
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