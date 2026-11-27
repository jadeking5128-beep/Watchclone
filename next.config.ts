import type { NextConfig } from "next";
const nextConfig: NextConfig = { images: { remotePatterns: [{ protocol: "image", hostname: "image.tmdb.org" }, { protocol: "https", hostname: "image.tmdb.org" }] } };
export default nextConfig;
