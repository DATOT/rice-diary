import type { NextConfig } from "next";
const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

console.log(internalHost);

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: {
    unoptimized: true,
  },
  experimental: {
    agentFeedback: true,
  },
  assetPrefix: isProd ? undefined : `http://${internalHost}:1420`,
  allowedDevOrigins: ["tauri.localhost", "192.168.1.9"],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/diary",
        permanent: false, // 307 temporary redirect
      },
    ];
  },
};

export default nextConfig;
