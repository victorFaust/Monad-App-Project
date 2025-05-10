"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, RefreshCw, ArrowRightLeft, Send } from "lucide-react"
import { SwapModal } from "@/components/modals/swap-modal"
import { TokenTransferModal } from "@/components/modals/token-transfer-modal"
import { AddTokenModal } from "@/components/modals/add-token-modal"
import { getAllTokenBalances, type TokenInfo } from "@/lib/token-service"
import type { WalletInfo } from "@/types/wallet"

interface TokenListProps {
  wallet: WalletInfo | null
  refreshBalance?: () => void
}

export function TokenList({ wallet, refreshBalance }: TokenListProps) {
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false)

  const fetchTokenBalances = async () => {
    if (!wallet?.address) {
      setTokens([])
      return
    }

    setIsLoading(true)
    try {
      const tokenBalances = await getAllTokenBalances(wallet.address)
      setTokens(tokenBalances)
    } catch (error) {
      console.error("Failed to fetch token balances:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTokenBalances()

    // Set up an interval to refresh balances every 30 seconds
    const intervalId = setInterval(fetchTokenBalances, 30000)

    return () => clearInterval(intervalId)
  }, [wallet])

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Token Balances</CardTitle>
          <div className="flex space-x-1">
            <Button variant="outline" size="icon" onClick={fetchTokenBalances} title="Refresh Balances">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsAddTokenModalOpen(true)} title="Add Custom Token">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsTransferModalOpen(true)} title="Transfer Tokens">
              <Send className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsSwapModalOpen(true)} title="Swap Tokens">
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : !wallet ? (
            <p className="text-sm text-gray-500">Connect your wallet to view token balances</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-gray-500">No tokens found in your wallet</p>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div key={token.address} className="flex justify-between items-center">
                  <div className="flex items-center">
                    {token.logoURI && (
                      <img
                        src={token.logoURI || "/placeholder.svg"}
                        alt={token.symbol}
                        className="w-5 h-5 mr-2 rounded-full"
                        onError={(e) => {
                          // If image fails to load, remove the src
                          ;(e.target as HTMLImageElement).src = ""
                        }}
                      />
                    )}
                    <span className="font-medium">{token.symbol}</span>
                  </div>
                  <span>{token.formattedBalance}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        wallet={wallet}
        refreshBalance={refreshBalance}
        refreshTokenBalances={fetchTokenBalances}
      />

      <TokenTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        wallet={wallet}
        refreshBalance={refreshBalance}
        refreshTokenBalances={fetchTokenBalances}
      />

      <AddTokenModal
        isOpen={isAddTokenModalOpen}
        onClose={() => setIsAddTokenModalOpen(false)}
        onTokenAdded={fetchTokenBalances}
      />
    </>
  )
}
