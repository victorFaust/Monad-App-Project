import { NextResponse } from "next/server"
import { getAccountBalance } from "@/lib/blockchain-service"

export async function GET(request: Request, { params }: { params: { address: string } }) {
  try {
    const address = params.address

    if (!address || !address.startsWith("0x")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid address format",
        },
        { status: 400 },
      )
    }

    try {
      const balanceData = await getAccountBalance(address)

      return NextResponse.json({
        success: true,
        data: {
          wei: balanceData.wei,
          balance: balanceData.ether,
        },
      })
    } catch (error: any) {
      console.error(`Blockchain service error for ${address}:`, error)

      // Return a fallback response
      return NextResponse.json({
        success: true,
        data: {
          wei: "0",
          balance: "0.0",
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
