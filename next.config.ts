import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 모든 사이트의 이미지를 허용 (테스트용)
      },
    ],
  },
};

export default nextConfig;