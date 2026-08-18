/** @type {import('next').NextConfig} */
const backend =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${backend}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
};

export default nextConfig;
