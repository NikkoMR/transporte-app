"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type TransportRequest = {
  id: string;
  full_name: string;
  phone: string;
  pickup_address: string;
  pickup_zone: string;
  destination_address: string;
  trip_date: string;
  requested_time: string;
  passenger_count: number;
  notes: string | null;
  status: string;
  assigned_driver_id: string | null;
  passenger_user_id: string | null;
  created_at?: string;
};

type Driver = {
  id: string;
  nombre: string;
  telefono: string;
  patente: string | null;
  capacidad: number;
  comuna_base: string | null;
  disponible: boolean;
  activo: boolean;
};

type TripFeedback = {
  id: string;
  transport_request_id: string;
  passenger_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function MiTransportePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<TransportRequest | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [feedback, setFeedback] = useState<TripFeedback | null>(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [guardandoFeedback, setGuardandoFeedback] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarSolicitud();
  }, []);

  async function cargarSolicitud() {
    setLoading(true);
    setMensaje("");
    setDriver(null);
    setFeedback(null);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    setUserId(userData.user.id);

    const { data: requestData, error: requestError } = await supabase
      .from("transport_requests")
      .select("*")
      .eq("passenger_user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (requestError) {
      console.error(requestError);
      setMensaje("No se pudo cargar tu solicitud.");
      setLoading(false);
      return;
    }

    setRequest(requestData as TransportRequest | null);

    if (requestData?.assigned_driver_id) {
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", requestData.assigned_driver_id)
        .maybeSingle();

      if (driverError) {
        console.error(driverError);
      } else {
        setDriver(driverData as Driver | null);
      }
    }

    if (requestData?.id) {
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("trip_feedback")
        .select("*")
        .eq("transport_request_id", requestData.id)
        .eq("passenger_user_id", userData.user.id)
        .maybeSingle();

      if (feedbackError) {
        console.error(feedbackError);
      } else {
        setFeedback(feedbackData as TripFeedback | null);
      }
    }

    setLoading(false);
  }

  async function enviarFeedback(e: React.FormEvent) {
    e.preventDefault();

    if (!userId || !request) return;

    if (request.status !== "finalizado") {
      setMensaje("Solo puedes evaluar un viaje finalizado.");
      return;
    }

    setGuardandoFeedback(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("trip_feedback")
      .insert({
        transport_request_id: request.id,
        passenger_user_id: userId,
        rating,
        comment: comment.trim() || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      setMensaje(
        "No se pudo guardar tu feedback. Puede que ya hayas evaluado este viaje."
      );
      setGuardandoFeedback(false);
      return;
    }

    setFeedback(data as TripFeedback);
    setMensaje("¡Gracias! Tu feedback fue enviado correctamente.");
    setGuardandoFeedback(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-white/10 border-t-yellow-300 animate-spin mb-4" />
          <p className="text-slate-300">Cargando tu transporte...</p>
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

      <section className="relative max-w-5xl mx-auto px-5 py-8 md:py-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-yellow-200 hover:underline mb-6"
        >
          ← Volver al dashboard
        </button>

        <header className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30 mb-8">
          <p className="text-sm uppercase tracking-[0.25em] text-yellow-200 mb-3">
            Mi transporte
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Estado de tu solicitud
          </h1>

          <p className="text-slate-200 max-w-3xl leading-relaxed">
            Aquí puedes revisar el estado de tu traslado, los datos del chofer
            asignado y dejar tu feedback al finalizar el viaje.
          </p>
        </header>

        {mensaje && (
          <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-yellow-100 p-4 mb-6">
            {mensaje}
          </div>
        )}

        {!request ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30 text-center">
            <h2 className="text-2xl font-bold mb-3">
              Aún no tienes una solicitud activa
            </h2>

            <p className="text-slate-300 mb-6">
              Crea una solicitud para que el sistema pueda asignarte un chofer.
            </p>

            <button
              onClick={() => router.push("/solicitar-transporte")}
              className="rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] px-5 py-3 font-bold transition"
            >
              Solicitar transporte
            </button>
          </section>
        ) : (
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-start">
            <aside className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30">
              <p className="text-sm uppercase tracking-[0.25em] text-yellow-200 mb-3">
                Estado actual
              </p>

              <h2 className="text-3xl font-bold mb-4">
                {statusTitle(request.status)}
              </h2>

              <StatusBadge status={request.status} />

              <div className="mt-6 space-y-3">
                <InfoItem title="Pasajero" value={request.full_name} />
                <InfoItem
                  title="Fecha"
                  value={`${request.trip_date} · ${request.requested_time}`}
                />
                <InfoItem
                  title="Cantidad"
                  value={`${request.passenger_count} persona${
                    request.passenger_count > 1 ? "s" : ""
                  }`}
                />
              </div>

              <button
                onClick={cargarSolicitud}
                className="mt-6 w-full rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 px-4 py-3 text-sm font-semibold"
              >
                Actualizar estado
              </button>
            </aside>

            <section className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30">
                <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-3">
                  Recogida y destino
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <InfoItem title="Comuna" value={request.pickup_zone} />
                  <InfoItem title="Teléfono" value={request.phone} />
                  <InfoItem title="Recogida" value={request.pickup_address} />
                  <InfoItem title="Destino" value={request.destination_address} />
                </div>

                {request.notes && (
                  <div className="mt-4">
                    <InfoItem title="Observaciones" value={request.notes} />
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30">
                <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-3">
                  Chofer asignado
                </p>

                {driver ? (
                  <>
                    <h3 className="text-2xl font-bold mb-4">
                      {driver.nombre}
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
                      <InfoItem title="Teléfono" value={driver.telefono} />
                      <InfoItem
                        title="Patente"
                        value={driver.patente || "No informada"}
                      />
                      <InfoItem
                        title="Comuna base"
                        value={driver.comuna_base || "No informada"}
                      />
                      <InfoItem
                        title="Capacidad"
                        value={`${driver.capacidad} pasajeros`}
                      />
                    </div>

                    <a
                      href={`tel:${driver.telefono}`}
                      className="mt-5 inline-block rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] px-5 py-3 font-bold transition"
                    >
                      Llamar chofer
                    </a>
                  </>
                ) : (
                  <p className="text-slate-300">
                    Todavía no hay chofer asignado. Te avisaremos por WhatsApp
                    cuando el sistema encuentre uno disponible.
                  </p>
                )}
              </div>

              {request.status === "finalizado" && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/30">
                  <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-3">
                    Feedback
                  </p>

                  {feedback ? (
                    <>
                      <h3 className="text-2xl font-bold mb-3">
                        Gracias por tu evaluación
                      </h3>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-3xl mb-2">
                          {"⭐".repeat(feedback.rating)}
                        </p>

                        <p className="text-slate-300">
                          {feedback.comment || "Sin comentario adicional."}
                        </p>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={enviarFeedback}>
                      <h3 className="text-2xl font-bold mb-3">
                        ¿Cómo estuvo tu traslado?
                      </h3>

                      <p className="text-slate-300 mb-5">
                        Tu opinión nos ayuda a mejorar la operación del evento.
                      </p>

                      <div className="mb-5">
                        <label className="block text-sm font-semibold mb-2 text-slate-200">
                          Calificación
                        </label>

                        <div className="flex gap-2 flex-wrap">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className={`w-12 h-12 rounded-2xl text-2xl border transition ${
                                rating >= star
                                  ? "bg-yellow-300 text-[#111827] border-yellow-300"
                                  : "bg-black/20 border-white/10"
                              }`}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-5">
                        <label className="block text-sm font-semibold mb-2 text-slate-200">
                          Comentario opcional
                        </label>

                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Ej: llegó a tiempo, fue amable, me costó encontrar el punto..."
                          className="input-festival min-h-28 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={guardandoFeedback}
                        className="w-full rounded-xl bg-[#facc15] hover:bg-[#fde047] text-[#111827] px-5 py-3 font-bold transition disabled:opacity-60"
                      >
                        {guardandoFeedback
                          ? "Enviando feedback..."
                          : "Enviar feedback"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
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
      `}</style>
    </main>
  );
}

function statusTitle(status: string) {
  switch (status) {
    case "pendiente":
      return "Estamos buscando chofer";
    case "asignado":
      return "Transporte asignado";
    case "en_camino":
      return "El chofer va en camino";
    case "recogido":
      return "Pasajero recogido";
    case "finalizado":
      return "Viaje finalizado";
    case "cancelado":
      return "Solicitud cancelada";
    default:
      return "Solicitud registrada";
  }
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase();

  const style =
    normalized === "asignado"
      ? "bg-yellow-400/15 text-yellow-200 border-yellow-400/30"
      : normalized === "en_camino"
      ? "bg-blue-400/15 text-blue-200 border-blue-400/30"
      : normalized === "recogido"
      ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/30"
      : normalized === "finalizado"
      ? "bg-slate-400/15 text-slate-200 border-slate-400/30"
      : normalized === "pendiente"
      ? "bg-orange-400/15 text-orange-200 border-orange-400/30"
      : "bg-slate-400/15 text-slate-200 border-slate-400/30";

  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full border text-sm font-semibold ${style}`}
    >
      {status || "sin estado"}
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