/** @type {import('next').NextConfig} */
const nextConfig = {
  // Load native/CJS wallet deps as runtime externals instead of bundling them.
  // Minifying them into the serverless function breaks their constructors
  // ("TypeError: E is not a constructor" on Apple Wallet pass generation).
  experimental: {
    serverComponentsExternalPackages: ["archiver", "node-forge"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
