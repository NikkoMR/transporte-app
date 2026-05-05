import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Modo estricto para detectar problemas en el desarrollo

  // Desactivar Turbopack si no se necesita para evitar problemas con el build
  experimental: {
    turbopack: false, // Desactivar Turbopack, útil si estás teniendo problemas con él
  },

  // Configuración de imágenes (si estás utilizando imágenes de dominios externos)
  images: {
    domains: ['your-image-domain.com'], // Sustituye con tus dominios de imágenes
  },

  // Configuración de variables de entorno (esto depende de las claves que uses en producción)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, // Supabase URL
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY, // Supabase Anon Key
    KAPSO_API_KEY: process.env.KAPSO_API_KEY, // Clave de API de Kapso (si usas WhatsApp)
    KAPSO_PHONE_ID: process.env.KAPSO_PHONE_ID, // ID de teléfono de Kapso (si usas WhatsApp)
  },

  // Redirecciones (si necesitas redirigir rutas específicas)
  async redirects() {
    return [
      {
        source: '/old-page', // Ruta antigua
        destination: '/new-page', // Ruta nueva
        permanent: true, // Redirección permanente
      },
    ];
  },

  // Otras configuraciones necesarias para tu app
  async rewrites() {
    return [
      {
        source: '/some-source', // Ruta de origen
        destination: '/some-destination', // Ruta de destino
      },
    ];
  },
};

export default nextConfig;