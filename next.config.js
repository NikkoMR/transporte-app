// next.config.js

const nextConfig = {
  reactStrictMode: true, // Activar el modo estricto en React para detectar problemas

  // Desactivar Turbopack si no lo necesitas para evitar problemas con el build
  experimental: {
    turbopack: false, // Desactivar Turbopack, útil si estás teniendo problemas con él
  },

  // Configuración para las imágenes (si las usas de dominios externos)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-image-domain.com', // Cambia esto con tus dominios de imágenes
      },
    ],
  },

  // Configuración de variables de entorno
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, // URL de Supabase
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY, // Clave de Supabase
    KAPSO_API_KEY: process.env.KAPSO_API_KEY, // Clave de API de Kapso (para WhatsApp)
    KAPSO_PHONE_ID: process.env.KAPSO_PHONE_ID, // ID de teléfono de Kapso (para WhatsApp)
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

  // Reescrituras si necesitas cambiar el comportamiento de algunas rutas
  async rewrites() {
    return [
      {
        source: '/some-source', // Ruta de origen
        destination: '/some-destination', // Ruta de destino
      },
    ];
  },
};

module.exports = nextConfig;