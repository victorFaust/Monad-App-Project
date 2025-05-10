import { NextResponse } from "next/server"

// Validate if a string is a valid URL with http/https protocol
function isValidRpcUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === "http:" || urlObj.protocol === "https:"
  } catch (e) {
    return false
  }
}

// Get a valid RPC URL, with fallbacks
function getValidRpcUrl(): string {
  // Try environment variable first
  const envRpcUrl = process.env.MONAD_TESTNET_RPC

  // Validate the URL from environment variable
  if (envRpcUrl && isValidRpcUrl(envRpcUrl)) {
    return envRpcUrl
  }

  // Fall back to default RPC URL
  return "https://testnet-rpc.monad.xyz"
}

export async function POST(request: Request) {
  try {
    // Get the RPC URL
    const rpcUrl = getValidRpcUrl()

    // Get the request body
    const body = await request.json()

    // Forward the request to the RPC endpoint
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    // Get the response
    const data = await response.json()

    // Return the response
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("RPC proxy error:", error)
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`,
        },
      },
      { status: 500 },
    )
  }
}
