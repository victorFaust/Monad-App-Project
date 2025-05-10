"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle } from "lucide-react"
import type { WalletInfo } from "@/types/wallet"
import { TOKEN_LIST, getAllTokens, getTokenBalance, getTokenInfo } from "@/lib/token-service"

interface TokenTransferModalProps {
  isOpen: boolean
  onClose: () => void
  wallet: WalletInfo | null
  refreshBalance?: () => void
  refreshTokenBalances?: () => void
}

export function TokenTransferModal({
  isOpen,
  onClose,
  wallet,
  refreshBalance,
  refreshTokenBalances,
}: TokenTransferModalProps) {
  const { toast } = useToast()
  const [selectedToken, setSelectedToken] = useState(TOKEN_LIST.MON)
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [balance, setBalance] = useState("0")
  const [symbol, setSymbol] = useState("MON")
  const [isLoading, setIsLoading] = useState(false)
  const [tokens, setTokens] = useState<{ symbol: string; address: string }[]>([])

  // Load tokens
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

  // Update balance when wallet or selected token changes
  useEffect(() => {
    const updateBalance = async () => {
      if (!wallet?.address) return

      try {
        // Get token balance
        const balanceResult = await getTokenBalance(selectedToken, wallet.address)
        setBalance(Number.parseFloat(balanceResult.formattedBalance).toFixed(3))

        // Get token symbol
        const tokenInfo = await getTokenInfo(selectedToken)
        setSymbol(tokenInfo.symbol)
      } catch (error) {
        console.error("Failed to update balance:", error)
      }
    }

    if (isOpen) {
      updateBalance()
    }
  }, [wallet, selectedToken, isOpen])

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimals
    if (/^(\d*\.?\d*)$/.test(value) || value === "") {
      setAmount(value)
    }
  }

  const handleTokenChange = (value: string) => {
    setSelectedToken(value)
  }

  const handleTransfer = async () => {
    if (!wallet?.signer) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to transfer tokens",
        variant: "destructive",
      })
      return
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to transfer",
        variant: "destructive",
      })
      return
    }

    if (Number.parseFloat(amount) > Number.parseFloat(balance)) {
      toast({
        title: "Insufficient balance",
        description: `You don't have enough ${symbol} to complete this transfer`,
        variant: "destructive",
      })
      return
    }

    if (!ethers.isAddress(recipient)) {
      toast({
        title: "Invalid recipient",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Get token info for decimals
      const tokenInfo = await getTokenInfo(selectedToken)
      const decimals = tokenInfo.decimals

      // Parse amount with proper decimals
      const parsedAmount = ethers.parseUnits(amount, decimals)

      let tx

      // If it's the native token (MON)
      if (selectedToken.toLowerCase() === TOKEN_LIST.MON.toLowerCase()) {
        // Send native token
        tx = await wallet.signer.sendTransaction({
          to: recipient,
          value: parsedAmount,
        })
      } else {
        // For ERC-20 tokens
        const ERC20_ABI = ["function transfer(address to, uint amount) returns (bool)"]

        const tokenContract = new ethers.Contract(selectedToken, ERC20_ABI, wallet.signer)
        tx = await tokenContract.transfer(recipient, parsedAmount)
      }

      // Wait for transaction to be mined
      await tx.wait()

      toast({
        title: "Transfer successful",
        description: `Transferred ${amount} ${symbol} to ${recipient.substring(0, 6)}...${recipient.substring(38)}`,
      })

      // Close the modal after successful transfer
      onClose()

      // Refresh balances after transfer
      setTimeout(() => {
        refreshBalance && refreshBalance()
        refreshTokenBalances && refreshTokenBalances()
      }, 2000)
    } catch (error: any) {
      console.error("Transfer failed:", error)

      if (error.message?.includes("insufficient funds")) {
        toast({
          title: "Insufficient funds",
          description: "You don't have enough funds to complete this transfer including gas fees",
          variant: "destructive",
        })
      } else if (error.message?.includes("user rejected")) {
        toast({
          title: "Transaction rejected",
          description: "You rejected the transaction in your wallet",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Transfer failed",
          description: error.message || "Failed to transfer tokens. Please try again.",
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
          <DialogTitle>Transfer Tokens</DialogTitle>
        </DialogHeader>

        {!wallet ? (
          <div className="p-4 border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-300">Wallet Not Connected</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Please connect your wallet to transfer tokens.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Token selection */}
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Select value={selectedToken} onValueChange={handleTokenChange}>
                <SelectTrigger>
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

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="amount">Amount</Label>
                <span className="text-sm text-gray-500">
                  Balance: {balance} {symbol}
                </span>
              </div>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.000"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 dark:text-blue-400 p-0 h-auto"
                onClick={() => handleAmountChange(balance)}
              >
                Max
              </Button>
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
              />
            </div>

            {/* Transfer button */}
            <Button
              className="w-full"
              onClick={handleTransfer}
              disabled={isLoading || !amount || Number.parseFloat(amount) <= 0 || !recipient}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-white"></div>
                  Transferring...
                </div>
              ) : (
                "Transfer"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
