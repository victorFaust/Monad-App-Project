import { NextResponse } from "next/server"
import { getGasPrice } from "@/lib/blockchain-service"

export async function GET() {
  try {
    try {
      const gasPriceData = await getGasPrice()

      return NextResponse.json({
        success: true,
        data: {
          gasPrice: gasPriceData.gasPrice,
          gasPriceGwei: gasPriceData.gasPriceGwei,
        },
      })
    } catch (error: any) {
      console.error("Blockchain service error:", error)

      // Return a fallback response with estimated values
      return NextResponse.json({
        success: true,
        data: {
          gasPrice: "0",
          gasPriceGwei: "50.0", // Reasonable estimate for Monad testnet
          error: error.message,
        },
      })
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
