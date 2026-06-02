if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
  try {
    delete (globalThis as any).localStorage;
  } catch (e) {}
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["nodemailer", "pdf2json"],
  // Allow large video file uploads through API routes (default is 4MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/admin',
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config: { resolve: { fallback: Record<string, boolean> } }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
