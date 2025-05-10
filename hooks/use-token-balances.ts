"use client"

import { useState, useEffect, useCallback } from "react"
import { getAllTokens, getTokenBalance } from "@/lib/token-service"
import type { WalletInfo } from "@/types/wallet"

interface TokenWithBalance {
  address: string
  name: string
  symbol: string
  balance?: string
  formattedBalance?: string
  logoURI?: string
}

export function useTokenBalances(wallet: WalletInfo | null) {
  const [tokens, setTokens] = useState<TokenWithBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState(0)

  const refreshTokenBalances = useCallback(async () => {
    if (!wallet?.address) {
      setTokens([])
      setIsLoading(false)
      return
    }

    // Prevent refreshing too frequently (at most once every 10 seconds)
    const now = Date.now()
    if (now - lastRefreshTime < 10000) {
      console.log("Skipping refresh, too soon since last refresh")
      return
    }

    setIsRefreshing(true)
    setLastRefreshTime(now)

    try {
      const allTokens = getAllTokens()

      // Process tokens in batches to avoid overwhelming the RPC
      const batchSize = 3
      const results: TokenWithBalance[] = []

      for (let i = 0; i < allTokens.length; i += batchSize) {
        const batch = allTokens.slice(i, i + batchSize)
        const batchPromises = batch.map(async (token) => {
          try {
            const balanceInfo = await getTokenBalance(token.address, wallet.address)
            return {
              ...token,
              balance: balanceInfo.balance,
              formattedBalance: balanceInfo.formattedBalance,
            }
          } catch (error) {
            console.error(`Failed to get balance for ${token.symbol}:`, error)
            return {
              ...token,
              balance: "0",
              formattedBalance: "0",
            }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)

        // Add a small delay between batches
        if (i + batchSize < allTokens.length) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      // Filter tokens with non-zero balances and sort by balance
      const filteredTokens = results
        .filter((token) => {
          const balance = Number.parseFloat(token.formattedBalance || "0")
          return balance > 0
        })
        .sort((a, b) => {
          const balanceA = Number.parseFloat(a.formattedBalance || "0")
          const balanceB = Number.parseFloat(b.formattedBalance || "0")
          return balanceB - balanceA
        })

      setTokens(filteredTokens)
    } catch (error) {
      console.error("Failed to refresh token balances:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [wallet, lastRefreshTime])

  useEffect(() => {
    refreshTokenBalances()
  }, [refreshTokenBalances])

  return {
    tokens,
    isLoading,
    isRefreshing,
    refreshTokenBalances,
  }
}
