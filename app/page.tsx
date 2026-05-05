"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function redirigir() {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }

    redirigir();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
      <p className="text-slate-400">Cargando...</p>
    </main>
  );
}