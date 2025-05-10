import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    config: {
      apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || "Not configured",
      rpcUrl: process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC || "Not configured",
      nodeEnv: process.env.NODE_ENV,
    },
  })
}
