"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SwapModal } from "@/components/modals/swap-modal"
import type { WalletInfo } from "@/types/wallet"
import { ArrowLeftRight } from "lucide-react"

interface TokenSwapButtonProps {
  wallet: WalletInfo | null
  refreshBalance?: () => void
  refreshTokenBalances?: () => void
}

export function TokenSwapButton({ wallet, refreshBalance, refreshTokenBalances }: TokenSwapButtonProps) {
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsSwapModalOpen(true)} className="flex items-center" variant="outline">
        <ArrowLeftRight className="h-4 w-4 mr-2" />
        Swap Tokens
      </Button>

      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        wallet={wallet}
        refreshBalance={refreshBalance}
        refreshTokenBalances={refreshTokenBalances}
      />
    </>
  )
}
