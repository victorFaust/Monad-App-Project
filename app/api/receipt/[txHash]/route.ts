import { NextResponse } from "next/server"
import { getTransactionReceipt } from "@/lib/blockchain-service"

export async function GET(request: Request, { params }: { params: { txHash: string } }) {
  try {
    const txHash = params.txHash

    if (!txHash || !txHash.startsWith("0x")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid transaction hash format",
        },
        { status: 400 },
      )
    }

    const receipt = await getTransactionReceipt(txHash)

    return NextResponse.json({
      success: true,
      data: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1,
        from: receipt.from,
        to: receipt.to,
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
