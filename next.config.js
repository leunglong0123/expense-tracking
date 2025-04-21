/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Fixes packages that depend on Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      http: false,
      https: false,
      crypto: false,
      path: false,
      os: false,
      stream: false,
      zlib: false,
      events: false,
      child_process: false
    };

    // Handle node: protocol
    config.module.rules.push({
      test: /node:/,
      loader: 'ignore-loader'
    });

    return config;
  },
};

module.exports = nextConfig;
