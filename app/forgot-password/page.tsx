"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  // Handle password reset
  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Revisa tu correo electrónico para restablecer la contraseña.");
      // You can optionally redirect to the login page after sending the reset email
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white relative overflow-hidden flex items-center justify-center px-5 py-10">
      <section className="relative w-full max-w-md">
        <div className="text-center mb-7">
          <h1 className="text-3xl font-bold">Olvidaste tu contraseña</h1>
          <p className="text-slate-300 mt-2">
            Ingresa tu correo electrónico para recibir un enlace de
            restablecimiento de contraseña.
          </p>
        </div>

        <form
          onSubmit={handlePasswordReset}
          className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 shadow-2xl shadow-black/30"
        >
          <label className="block text-sm font-semibold mb-2">Correo electrónico</label>
          <input
            className="w-full mb-4 px-4 py-3 rounded-xl bg-black/20 border border-white/10 focus:border-yellow-300 outline-none placeholder:text-slate-500"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {message && (
            <p className="text-center text-sm text-yellow-300 mb-4">{message}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] py-3 font-bold transition shadow-lg shadow-yellow-950/20"
          >
            Enviar enlace de restablecimiento
          </button>
        </form>
      </section>
    </main>
  );
}