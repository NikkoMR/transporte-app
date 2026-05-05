import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Activar el modo estricto en React (para detectar problemas)
  
  // Configuración para las imágenes (si las usas de dominios externos)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-image-domain.com', // Cambia esto con tus dominios de imágenes
      },
    ],
  },

  // Configuración de las variables de entorno
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, // URL de Supabase
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY, // Clave de Supabase
    KAPSO_API_KEY: process.env.KAPSO_API_KEY, // Clave de API de Kapso (para WhatsApp)
    KAPSO_PHONE_ID: process.env.KAPSO_PHONE_ID, // ID de teléfono de Kapso (para WhatsApp)
  },
};

export default nextConfig;