"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Asegúrate de que este sea el archivo correcto de configuración de Supabase

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Establecer el canal y suscribirse al evento
    const channel = supabase
      .channel('public:password_resets') // Nombre del canal
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'password_resets' }, (payload) => {
        console.log("Nueva solicitud de restablecimiento de contraseña:", payload.new);
        // Aquí puedes realizar otras acciones con la solicitud, por ejemplo, mostrar un mensaje
      })
      .subscribe();

    // Limpieza de la suscripción cuando el componente se desmonta
    return () => {
      channel.unsubscribe(); // Usar unsubscribe en lugar de removeSubscription
    };
  }, []); // El array vacío asegura que el useEffect se ejecute solo una vez cuando el componente se monte

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.api.resetPasswordForEmail(email);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Te hemos enviado un enlace de restablecimiento de contraseña.");
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white relative overflow-hidden flex items-center justify-center px-5 py-10">
      <section className="relative w-full max-w-md">
        <div className="text-center mb-7">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white text-[#0d1117] flex items-center justify-center text-3xl font-bold shadow-lg mb-4">
            T
          </div>

          <h1 className="text-3xl font-bold">Restablecer Contraseña</h1>
          <p className="text-slate-300 mt-2">Ingresa tu correo para recibir el enlace de restablecimiento.</p>
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

          <button
            type="submit"
            className="w-full rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] py-3 font-bold transition shadow-lg shadow-yellow-950/20"
          >
            Enviar enlace
          </button>
        </form>

        {message && <p className="text-sm text-slate-300 mt-4">{message}</p>}
      </section>
    </main>
  );
}