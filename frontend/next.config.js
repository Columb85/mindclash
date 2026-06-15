/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react',
      'framer-motion',
      'wagmi',
      'viem',
      '@rainbow-me/rainbowkit',
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    // Polling avoids Watchpack scanning C:\ system files on Windows (EINVAL on pagefile.sys, etc.)
    config.watchOptions = {
      poll: 2000,
      aggregateTimeout: 500,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/public-release/**',
      ],
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
};

module.exports = nextConfig;
