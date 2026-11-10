import type { NextConfig } from "next";
const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: {
    unoptimized: true,
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
};

export default nextConfig;
