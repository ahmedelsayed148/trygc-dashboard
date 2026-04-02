import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
