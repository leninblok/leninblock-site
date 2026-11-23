import type { NextConfig } from "next";
import { gameUrl } from "./src/content/site";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.leninblock.ru" }],
        destination: "https://leninblock.ru/:path*",
        permanent: true,
      },
      { source: "/play", destination: gameUrl, permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            // The document policy survives client navigation from the home page.
            // Camera access still requires an explicit user request and consent.
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/kruzhok/runtime/:path*",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};
export default nextConfig;
