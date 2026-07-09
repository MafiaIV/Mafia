/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mafia/shared'],
  reactStrictMode: true,
  webpack: (config) => {
    // packages/shared uses NodeNext-style ".js" specifiers for its own
    // ".ts" files (required for the server's Node ESM resolution) —
    // teach webpack to follow the same alias when bundling for the browser.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
