import { NextResponse } from "next/server"
import { sendTransaction } from "@/lib/blockchain-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { to, value, data } = body

    if (!to || !to.startsWith("0x")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid recipient address",
        },
        { status: 400 },
      )
    }

    if (!value || isNaN(Number(value)) || Number(value) <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid transaction value",
        },
        { status: 400 },
      )
    }

    const result = await sendTransaction(to, value, data || "0x")

    return NextResponse.json({
      success: true,
      data: result,
    })
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
