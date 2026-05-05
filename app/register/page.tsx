"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!nombre || !email || !password) {
      alert("Completa nombre, correo y contraseña");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      alert("La contraseña debe tener mínimo 6 caracteres");
      setLoading(false);
      return;
    }

    const role =
      inviteCode.trim().toUpperCase() === "DRIVER2026"
        ? "driver"
        : "passenger";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
        },
      },
    });

    if (error) {
      alert("Error al crear cuenta: " + error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        nombre,
        role,
      });

      if (profileError) {
        alert(
          "La cuenta se creó, pero hubo error creando el perfil: " +
            profileError.message
        );
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white relative overflow-hidden flex items-center justify-center px-5 py-10">
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

      <section className="relative w-full max-w-md">
        <div className="text-center mb-7">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white text-[#0d1117] flex items-center justify-center text-3xl font-bold shadow-lg mb-4">
            T
          </div>

          <p className="text-sm uppercase tracking-[0.25em] text-yellow-200 mb-2">
            Herederos de la Paz
          </p>

          <h1 className="text-3xl font-bold">Crear cuenta</h1>

          <p className="text-slate-300 mt-2">
            Regístrate para solicitar transporte o ingresar como chofer del evento.
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 shadow-2xl shadow-black/30"
        >
          <label className="block text-sm font-semibold mb-2">Nombre</label>

          <input
            className="w-full mb-4 px-4 py-3 rounded-xl bg-black/20 border border-white/10 focus:border-yellow-300 outline-none placeholder:text-slate-500"
            type="text"
            placeholder="Tu nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <label className="block text-sm font-semibold mb-2">
            Correo electrónico
          </label>

          <input
            className="w-full mb-4 px-4 py-3 rounded-xl bg-black/20 border border-white/10 focus:border-yellow-300 outline-none placeholder:text-slate-500"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="block text-sm font-semibold mb-2">Contraseña</label>

          <input
            className="w-full mb-4 px-4 py-3 rounded-xl bg-black/20 border border-white/10 focus:border-yellow-300 outline-none placeholder:text-slate-500"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label className="block text-sm font-semibold mb-2">
            Código de invitación
          </label>

          <input
            className="w-full mb-2 px-4 py-3 rounded-xl bg-black/20 border border-white/10 focus:border-yellow-300 outline-none placeholder:text-slate-500"
            type="text"
            placeholder="Opcional, solo para choferes"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />

          <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-slate-300">
              Si eres pasajero, deja el código vacío. Si eres chofer autorizado,
              ingresa tu código de invitación.
            </p>

            {inviteCode.trim() && (
              <p className="text-xs mt-2 text-yellow-200">
                {inviteCode.trim().toUpperCase() === "DRIVER2026"
                  ? "Código válido: se creará una cuenta de chofer."
                  : "Código no reconocido: se creará una cuenta de pasajero."}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] py-3 font-bold transition shadow-lg shadow-yellow-950/20 disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-4 text-center">
          <p className="text-sm text-slate-300">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-yellow-200 font-semibold hover:underline"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}