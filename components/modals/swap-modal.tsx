"use client"

import { useState, useEffect, useContext } from "react"
import { ArrowDown, RefreshCw, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { WalletInfo } from "@/types/wallet"
import {
  TOKEN_LIST,
  getAllTokens,
  getTokenBalance,
  getTokenInfo,
  getTokenPrice,
  swapTokens,
  calculatePriceImpact,
} from "@/lib/token-service"
import { TransactionContext } from "@/contexts/transaction-context"
import { debugSwap } from "@/lib/debug-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SwapModalProps {
  isOpen: boolean
  onClose: () => void
  wallet: WalletInfo | null
  refreshBalance?: () => void
  refreshTokenBalances?: () => void
}

export function SwapModal({ isOpen, onClose, wallet, refreshBalance, refreshTokenBalances }: SwapModalProps) {
  const { toast } = useToast()
  const [fromToken, setFromToken] = useState(TOKEN_LIST.MON)
  const [toToken, setToToken] = useState(TOKEN_LIST.USDC)
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [fromBalance, setFromBalance] = useState("0")
  const [toBalance, setToBalance] = useState("0")
  const [fromSymbol, setFromSymbol] = useState("MON")
  const [toSymbol, setToSymbol] = useState("USDC")
  const [isLoading, setIsLoading] = useState(false)
  const [slippage, setSlippage] = useState("0.5")
  const [tokens, setTokens] = useState<{ symbol: string; address: string }[]>([])
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [usingSimulation, setUsingSimulation] = useState(true)
  const [priceImpact, setPriceImpact] = useState<number>(0)
  const { addTransaction } = useContext(TransactionContext)

  // Load tokens and balances
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const allTokens = getAllTokens()
        setTokens(allTokens.map((t) => ({ symbol: t.symbol, address: t.address })))
      } catch (error) {
        console.error("Failed to load tokens:", error)
      }
    }

    loadTokens()
  }, [])

  // Update balances when wallet or tokens change
  useEffect(() => {
    const updateBalances = async () => {
      if (!wallet?.address) return

      try {
        // Get from token balance
        const fromBalanceResult = await getTokenBalance(fromToken, wallet.address)
        setFromBalance(Number.parseFloat(fromBalanceResult.formattedBalance).toFixed(3))

        // Get to token balance
        const toBalanceResult = await getTokenBalance(toToken, wallet.address)
        setToBalance(Number.parseFloat(toBalanceResult.formattedBalance).toFixed(3))

        // Get token symbols
        const fromTokenInfo = await getTokenInfo(fromToken)
        setFromSymbol(fromTokenInfo.symbol)

        const toTokenInfo = await getTokenInfo(toToken)
        setToSymbol(toTokenInfo.symbol)

        // Calculate exchange rate
        try {
          const fromPrice = await getTokenPrice(fromToken)
          const toPrice = await getTokenPrice(toToken)

          if (fromPrice > 0 && toPrice > 0) {
            setExchangeRate(fromPrice / toPrice)
          } else {
            console.warn("Invalid price data received:", { fromPrice, toPrice })
            // Fallback to a default exchange rate
            setExchangeRate(1.0)
          }
        } catch (priceError) {
          console.error("Error fetching token prices:", priceError)
          // Fallback to a default exchange rate
          setExchangeRate(1.0)
        }
      } catch (error) {
        console.error("Failed to update balances:", error)
      }
    }

    if (isOpen) {
      updateBalances()
    }
  }, [wallet, fromToken, toToken, isOpen])

  // Update to amount and price impact when from amount changes
  useEffect(() => {
    if (exchangeRate && fromAmount) {
      const fromAmountNum = Number.parseFloat(fromAmount)

      // Calculate price impact
      const impact = calculatePriceImpact(fromSymbol, toSymbol, fromAmountNum)
      setPriceImpact(impact)

      // Apply price impact to the exchange rate
      const impactFactor = 1 - impact / 100
      const calculatedToAmount = fromAmountNum * exchangeRate * impactFactor

      setToAmount(calculatedToAmount.toFixed(3))
    } else {
      setToAmount("")
      setPriceImpact(0)
    }
  }, [fromAmount, exchangeRate, fromSymbol, toSymbol])

  const handleFromAmountChange = (value: string) => {
    // Only allow numbers and decimals
    if (/^(\d*\.?\d*)$/.test(value) || value === "") {
      setFromAmount(value)
    }
  }

  const handleToAmountChange = (value: string) => {
    // Only allow numbers and decimals
    if (/^(\d*\.?\d*)$/.test(value) || value === "") {
      setToAmount(value)

      if (exchangeRate && value) {
        // Reverse calculation accounting for price impact
        const toAmountNum = Number.parseFloat(value)
        const impact = calculatePriceImpact(fromSymbol, toSymbol, Number.parseFloat(fromAmount) || 0)
        const impactFactor = 1 - impact / 100

        const calculatedFromAmount = toAmountNum / (exchangeRate * impactFactor)
        setFromAmount(calculatedFromAmount.toFixed(3))
      } else {
        setFromAmount("")
      }
    }
  }

  const handleFromTokenChange = (value: string) => {
    if (value === toToken) {
      // Swap the tokens if the user selects the same token
      setToToken(fromToken)
    }
    setFromToken(value)
  }

  const handleToTokenChange = (value: string) => {
    if (value === fromToken) {
      // Swap the tokens if the user selects the same token
      setFromToken(toToken)
    }
    setToToken(value)
  }

  const handleSwapTokens = () => {
    const tempToken = fromToken
    const tempSymbol = fromSymbol
    const tempAmount = fromAmount

    setFromToken(toToken)
    setFromSymbol(toSymbol)
    setFromAmount(toAmount)

    setToToken(tempToken)
    setToSymbol(tempSymbol)
    setToAmount(tempAmount)
  }

  const getPriceImpactColor = () => {
    if (priceImpact < 1) return "text-green-600 dark:text-green-400"
    if (priceImpact < 3) return "text-yellow-600 dark:text-yellow-400"
    if (priceImpact < 5) return "text-orange-600 dark:text-orange-400"
    return "text-red-600 dark:text-red-400"
  }

  const handleSwap = async () => {
    if (!wallet?.signer) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to swap tokens",
        variant: "destructive",
      })
      return
    }

    if (!fromAmount || Number.parseFloat(fromAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to swap",
        variant: "destructive",
      })
      return
    }

    if (Number.parseFloat(fromAmount) > Number.parseFloat(fromBalance)) {
      toast({
        title: "Insufficient balance",
        description: `You don't have enough ${fromSymbol} to complete this swap`,
        variant: "destructive",
      })
      return
    }

    // Warn about high price impact
    if (priceImpact > 5) {
      const confirm = window.confirm(
        `Warning: This swap has a high price impact of ${priceImpact.toFixed(2)}%. This means you are losing significant value due to the size of your trade. Do you want to continue?`,
      )
      if (!confirm) return
    }

    setIsLoading(true)

    try {
      // Log debug information
      debugSwap({
        fromToken,
        fromSymbol,
        toToken,
        toSymbol,
        fromAmount,
        toAmount,
        exchangeRate,
        slippage: Number.parseFloat(slippage),
        walletAddress: wallet.address,
        priceImpact,
      })

      // Call the swap function with proper parameters
      const result = await swapTokens(
        {
          fromToken,
          toToken,
          amount: fromAmount,
          slippage: Number.parseFloat(slippage),
        },
        wallet.signer,
      )

      // Add transaction to history
      addTransaction({
        hash: result.hash,
        from: wallet.address,
        to: toToken,
        value: `${fromAmount} ${fromSymbol} → ${result.outputAmount} ${toSymbol}`,
        timestamp: Date.now(),
        status: "pending",
      })

      toast({
        title: "Swap initiated",
        description: `Swapping ${fromAmount} ${fromSymbol} to ${result.outputAmount} ${toSymbol}`,
      })

      // Close the modal after successful swap
      onClose()

      // Refresh balances after swap
      setTimeout(() => {
        refreshBalance && refreshBalance()
        refreshTokenBalances && refreshTokenBalances()
      }, 2000)
    } catch (error: any) {
      console.error("Swap failed:", error)

      // Provide more specific error messages based on common swap failures
      if (error.message?.includes("insufficient funds")) {
        toast({
          title: "Insufficient funds",
          description: "You don't have enough funds to complete this swap including gas fees",
          variant: "destructive",
        })
      } else if (error.message?.includes("user rejected")) {
        toast({
          title: "Transaction rejected",
          description: "You rejected the transaction in your wallet",
          variant: "destructive",
        })
      } else if (error.message?.includes("slippage")) {
        toast({
          title: "Slippage error",
          description:
            "The price moved too much during the swap. Try increasing slippage tolerance or swap a smaller amount",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Swap failed",
          description: error.message || "Failed to swap tokens. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Swap Tokens</DialogTitle>
        </DialogHeader>

        {!wallet ? (
          <div className="p-4 border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-300">Wallet Not Connected</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Please connect your wallet to swap tokens.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert
              variant="warning"
              className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30"
            >
              <Info className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Using simulation mode for swaps. Transactions will be created but tokens won't actually be exchanged.
              </AlertDescription>
            </Alert>

            {/* From token */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="from-amount">From</Label>
                <span className="text-sm text-gray-500">
                  Balance: {fromBalance} {fromSymbol}
                </span>
              </div>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    id="from-amount"
                    value={fromAmount}
                    onChange={(e) => handleFromAmountChange(e.target.value)}
                    placeholder="0.000"
                    className="text-lg"
                  />
                </div>
                <Select value={fromToken} onValueChange={handleFromTokenChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token.address} value={token.address}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 dark:text-blue-400 p-0 h-auto"
                onClick={() => handleFromAmountChange(fromBalance)}
              >
                Max
              </Button>
            </div>

            {/* Swap button */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-gray-100 dark:bg-gray-800"
                onClick={handleSwapTokens}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>

            {/* To token */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="to-amount">To</Label>
                <span className="text-sm text-gray-500">
                  Balance: {toBalance} {toSymbol}
                </span>
              </div>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    id="to-amount"
                    value={toAmount}
                    onChange={(e) => handleToAmountChange(e.target.value)}
                    placeholder="0.000"
                    className="text-lg"
                  />
                </div>
                <Select value={toToken} onValueChange={handleToTokenChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token.address} value={token.address}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exchange rate and price impact */}
            {exchangeRate && (
              <div className="space-y-1">
                <div className="text-sm text-gray-500 flex items-center justify-between">
                  <span>
                    1 {fromSymbol} ≈ {exchangeRate.toFixed(3)} {toSymbol}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
                {priceImpact > 0 && (
                  <div className="text-sm flex items-center justify-between">
                    <span>Price Impact:</span>
                    <span className={getPriceImpactColor()}>{priceImpact.toFixed(2)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Slippage */}
            <div className="space-y-2">
              <Label htmlFor="slippage">Slippage Tolerance</Label>
              <div className="flex space-x-2">
                <Input id="slippage" value={slippage} onChange={(e) => setSlippage(e.target.value)} className="w-20" />
                <span className="flex items-center">%</span>
                <div className="flex space-x-1">
                  {["0.1", "0.5", "1.0"].map((value) => (
                    <Button
                      key={value}
                      variant="outline"
                      size="sm"
                      onClick={() => setSlippage(value)}
                      className={slippage === value ? "bg-blue-100 dark:bg-blue-900/30" : ""}
                    >
                      {value}%
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Swap button */}
            <Button
              className="w-full"
              onClick={handleSwap}
              disabled={isLoading || !fromAmount || Number.parseFloat(fromAmount) <= 0}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-white"></div>
                  Swapping...
                </div>
              ) : (
                "Swap"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
