import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeZone(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

function cleanPhone(phone: string) {
  return String(phone).replace(/\D/g, "");
}

async function sendKapsoPassengerTemplate(params: {
  phone: string;
  name: string;
  driver: string;
  vehicle: string;
  plate: string;
  trackingUrl: string;
}) {
  if (!process.env.KAPSO_API_KEY || !process.env.KAPSO_PHONE_ID) {
    throw new Error("Faltan KAPSO_API_KEY o KAPSO_PHONE_ID");
  }

  const response = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${process.env.KAPSO_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.KAPSO_API_KEY!,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone(params.phone),
        type: "template",
        template: {
          name: "transporte_asignado",
          language: {
            code: "es_ES",
          },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: params.name },
                { type: "text", text: params.driver },
                { type: "text", text: params.vehicle },
                { type: "text", text: params.plate },
                { type: "text", text: params.trackingUrl },
              ],
            },
          ],
        },
      }),
    }
  );

  const data = await response.json();

  console.log("KAPSO REINTENTO PASAJERO STATUS:", response.status);
  console.log("KAPSO REINTENTO PASAJERO RESULT:", data);

  if (!response.ok) {
    throw new Error(`Kapso pasajero devolvió ${response.status}`);
  }
}

async function sendKapsoDriverTemplate(params: {
  phone: string;
  driverName: string;
  passengerName: string;
  passengerPhone: string;
  pickupAddress: string;
  destinationAddress: string;
  requestedTime: string;
  passengerCount: string;
}) {
  if (!process.env.KAPSO_API_KEY || !process.env.KAPSO_PHONE_ID) {
    throw new Error("Faltan KAPSO_API_KEY o KAPSO_PHONE_ID");
  }

  const response = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${process.env.KAPSO_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.KAPSO_API_KEY!,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone(params.phone),
        type: "template",
        template: {
          name: "nuevo_viaje_chofer",
          language: {
            code: "es",
          },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: params.driverName },
                { type: "text", text: params.passengerName },
                { type: "text", text: params.passengerPhone },
                { type: "text", text: params.pickupAddress },
                { type: "text", text: params.destinationAddress },
                { type: "text", text: params.requestedTime },
                { type: "text", text: params.passengerCount },
              ],
            },
          ],
        },
      }),
    }
  );

  const data = await response.json();

  console.log("KAPSO REINTENTO CHOFER STATUS:", response.status);
  console.log("KAPSO REINTENTO CHOFER RESULT:", data);

  if (!response.ok) {
    throw new Error(`Kapso chofer devolvió ${response.status}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const requestId = body?.requestId || null;

    let pendingQuery = supabase
      .from("transport_requests")
      .select("*")
      .eq("status", "pendiente")
      .is("assigned_driver_id", null)
      .order("created_at", { ascending: true });

    if (requestId) {
      pendingQuery = pendingQuery.eq("id", requestId).limit(1);
    } else {
      pendingQuery = pendingQuery.limit(10);
    }

    const { data: pendingRequests, error: pendingError } = await pendingQuery;

    if (pendingError) {
      console.error("ERROR BUSCANDO PENDIENTES:", pendingError);
      return NextResponse.json(
        { error: "Error buscando solicitudes pendientes" },
        { status: 500 }
      );
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      return NextResponse.json({
        success: true,
        assigned: false,
        message: "No hay solicitudes pendientes para reasignar.",
      });
    }

    const { data: availableDrivers, error: driversError } = await supabase
      .from("drivers")
      .select("*")
      .eq("activo", true)
      .eq("disponible", true)
      .order("created_at", { ascending: true });

    if (driversError) {
      console.error("ERROR BUSCANDO CHOFERES:", driversError);
      return NextResponse.json(
        { error: "Error buscando choferes disponibles" },
        { status: 500 }
      );
    }

    if (!availableDrivers || availableDrivers.length === 0) {
      return NextResponse.json({
        success: true,
        assigned: false,
        message: "No hay choferes disponibles.",
      });
    }

    for (const pendingRequest of pendingRequests) {
      const passengerCount = Number(pendingRequest.passenger_count);
      const pickupZone = normalizeZone(pendingRequest.pickup_zone);

      const driver =
        availableDrivers.find((d) => {
          const sameZone = normalizeZone(d.comuna_base) === pickupZone;
          const enoughCapacity = Number(d.capacidad) >= passengerCount;
          return sameZone && enoughCapacity && d.disponible === true && d.activo === true;
        }) || null;

      if (!driver) {
        continue;
      }

      const { error: updateRequestError } = await supabase
        .from("transport_requests")
        .update({
          status: "asignado",
          assigned_driver_id: driver.id,
        })
        .eq("id", pendingRequest.id)
        .eq("status", "pendiente")
        .is("assigned_driver_id", null);

      if (updateRequestError) {
        console.error("ERROR ASIGNANDO SOLICITUD:", updateRequestError);
        continue;
      }

      const { error: updateDriverError } = await supabase
        .from("drivers")
        .update({
          disponible: false,
        })
        .eq("id", driver.id);

      if (updateDriverError) {
        console.error("ERROR OCUPANDO CHOFER:", updateDriverError);
        continue;
      }

      driver.disponible = false;

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;

      const trackingUrl = `${baseUrl}/tracking/${pendingRequest.id}`;

      try {
        await sendKapsoPassengerTemplate({
          phone: pendingRequest.phone,
          name: pendingRequest.full_name,
          driver: driver.nombre,
          vehicle: "Vehículo asignado",
          plate: driver.patente || "No informado",
          trackingUrl,
        });
      } catch (whatsappError) {
        console.error("WHATSAPP PASAJERO REINTENTO ERROR:", whatsappError);
      }

      try {
        await sendKapsoDriverTemplate({
          phone: driver.telefono,
          driverName: driver.nombre,
          passengerName: pendingRequest.full_name,
          passengerPhone: pendingRequest.phone,
          pickupAddress: pendingRequest.pickup_address,
          destinationAddress: pendingRequest.destination_address,
          requestedTime: pendingRequest.requested_time,
          passengerCount: String(pendingRequest.passenger_count),
        });
      } catch (whatsappDriverError) {
        console.error("WHATSAPP CHOFER REINTENTO ERROR:", whatsappDriverError);
      }

      return NextResponse.json({
        success: true,
        assigned: true,
        requestId: pendingRequest.id,
        driverId: driver.id,
        message: "Solicitud pendiente asignada correctamente.",
      });
    }

    return NextResponse.json({
      success: true,
      assigned: false,
      message:
        "Hay solicitudes pendientes, pero no hay chofer compatible por comuna/capacidad.",
    });
  } catch (error) {
    console.error("ERROR RETRY ASSIGNMENT:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}