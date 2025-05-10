import { NextResponse } from "next/server"
import { callContractMethod } from "@/lib/blockchain-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contractAddress, abi, method, params } = body

    if (!contractAddress || !contractAddress.startsWith("0x")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid contract address",
        },
        { status: 400 },
      )
    }

    if (!abi || !Array.isArray(abi)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ABI format",
        },
        { status: 400 },
      )
    }

    if (!method) {
      return NextResponse.json(
        {
          success: false,
          error: "Method name is required",
        },
        { status: 400 },
      )
    }

    const result = await callContractMethod(contractAddress, abi, method, params || [])

    return NextResponse.json({
      success: true,
      data: {
        result,
      },
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
