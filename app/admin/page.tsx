"use client"; // Esto indica que este archivo es un componente de cliente

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Asegúrate de que este sea el archivo correcto de la configuración de Supabase.

export default function AdminPage() {
  const [requests, setRequests] = useState([]);
  
  useEffect(() => {
    const channel = supabase
      .channel('public:transport_requests') // Asegúrate de que el canal sea correcto
      .on('INSERT', (payload) => {
        console.log("Nueva solicitud:", payload.new);
        setRequests((prevRequests) => [payload.new, ...prevRequests]); // Actualiza el estado correctamente
      })
      .subscribe(); // Asegúrate de llamar a .subscribe() para activar la escucha de eventos

    return () => {
      // Limpieza de la suscripción cuando el componente se desmonta
      supabase.removeSubscription(channel);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section>
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-5">Solicitudes de Transporte</h1>
          {requests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-white/20 p-6 mb-4">
              <h3 className="font-bold">{request.full_name}</h3>
              <p>{request.requested_time} pasajeros</p>
              <p>{request.status}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}