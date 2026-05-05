"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
      return;
    }

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

          <h1 className="text-3xl font-bold">Iniciar sesión</h1>

          <p className="text-slate-300 mt-2">
            Accede a la app de transporte oficial del evento.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 shadow-2xl shadow-black/30"
        >
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

          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold">Contraseña</label>

            <Link
              href="/forgot-password"
              className="text-sm text-yellow-200 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <input
            className="w-full mb-5 px-4 py-3 rounded-xl bg-black/20 border border-white/10 focus:border-yellow-300 outline-none placeholder:text-slate-500"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] py-3 font-bold transition shadow-lg shadow-yellow-950/20"
          >
            Entrar
          </button>
        </form>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-4 text-center">
          <p className="text-sm text-slate-300">
            ¿Nuevo en Transporte App?{" "}
            <Link href="/register" className="text-yellow-200 font-semibold hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}