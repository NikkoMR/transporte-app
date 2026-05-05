"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Asegúrate de que este sea el archivo correcto de configuración de Supabase

export default function AdminPage() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    // Establecer el canal y suscribirse al evento de inserción en la tabla
    const channel = supabase
      .channel('public:transport_requests') // Nombre del canal
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transport_requests' }, (payload) => { // Cambié 'INSERT' por 'postgres_changes'
        console.log("Nueva solicitud:", payload.new); // Log para ver qué contiene la solicitud
        setRequests((prevRequests) => [payload.new, ...prevRequests]); // Actualiza el estado con la nueva solicitud
      })
      .subscribe(); // Activa la suscripción al canal

    // Limpieza de la suscripción cuando el componente se desmonta
    return () => {
      supabase.removeSubscription(channel); // Elimina la suscripción para evitar fugas de memoria
    };
  }, []); // El array vacío asegura que el useEffect se ejecute solo una vez cuando el componente se monte

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section>
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-5">Solicitudes de Transporte</h1>
          {requests.length > 0 ? (
            requests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-white/20 p-6 mb-4">
                <h3 className="font-bold">{request.full_name}</h3>
                <p>{request.requested_time} pasajeros</p>
                <p>{request.status}</p>
              </div>
            ))
          ) : (
            <p>No hay solicitudes disponibles.</p>
          )}
        </div>
      </section>
    </main>
  );
}