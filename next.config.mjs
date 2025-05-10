/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  trailingSlash: false,
  env: {
    NEXT_PUBLIC_API_ENDPOINT: process.env.NEXT_PUBLIC_API_ENDPOINT || "https://v0-break-down-ts-ixfmlfv4o-victorfausts-projects.vercel.app/api",
    NEXT_PUBLIC_MONAD_TESTNET_RPC: process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
