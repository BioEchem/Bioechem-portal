import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/school",
        destination: "/dashboard",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
