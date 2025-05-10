import { NextResponse } from "next/server"
import { deployContract } from "@/lib/blockchain-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { abi, bytecode, constructorArgs } = body

    if (!abi || !Array.isArray(abi)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ABI format",
        },
        { status: 400 },
      )
    }

    if (!bytecode || !bytecode.startsWith("0x")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid bytecode format",
        },
        { status: 400 },
      )
    }

    const result = await deployContract(abi, bytecode, constructorArgs || [])

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
