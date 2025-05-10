"use client"

import { useState, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ethers } from "ethers"
import type { WalletInfo } from "@/types/wallet"
import { TransactionContext } from "@/contexts/transaction-context"

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  initialParams: {
    to: string
    value: string
    data: string
  }
  wallet: WalletInfo | null
}

export function TransactionModal({ isOpen, onClose, initialParams, wallet }: TransactionModalProps) {
  const [to, setTo] = useState(initialParams.to)
  const [value, setValue] = useState(initialParams.value)
  const [data, setData] = useState(initialParams.data)
  const [showAdvanced, setShowAdvanced] = useState(!!initialParams.data)
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { addTransaction, updateTransaction } = useContext(TransactionContext)

  const handleSubmit = async () => {
    // Basic validation
    if (!to || !to.startsWith("0x")) {
      setStatus({ message: "Invalid recipient address", isError: true })
      return
    }

    if (!value || isNaN(Number.parseFloat(value)) || Number.parseFloat(value) <= 0) {
      setStatus({ message: "Invalid amount", isError: true })
      return
    }

    if (!wallet) {
      setStatus({ message: "No wallet connected", isError: true })
      return
    }

    setStatus({ message: "Sending transaction...", isError: false })
    setIsSubmitting(true)

    try {
      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error("MetaMask is not available")
      }

      // Convert value to wei
      const valueInWei = ethers.parseEther(value)

      // Create transaction parameters
      const transactionParameters = {
        to,
        from: wallet.address,
        value: valueInWei.toString(16), // Convert to hex
        data: showAdvanced && data ? data : "0x",
      }

      // Send transaction
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [transactionParameters],
      })

      // Add transaction to context with more details
      addTransaction({
        hash: txHash,
        from: wallet.address,
        to,
        value,
        timestamp: Date.now(),
        status: "pending",
      })

      // Set up a listener to update the transaction status
      const provider = new ethers.BrowserProvider(window.ethereum)
      provider.once(txHash, (transaction) => {
        // Update transaction status when confirmed
        updateTransaction(txHash, {
          status: "confirmed",
          blockNumber: transaction.blockNumber?.toString(),
        })
      })

      setStatus({
        message: `Transaction sent! Hash: ${txHash}`,
        isError: false,
      })

      toast({
        title: "Transaction Sent",
        description: `Transaction has been submitted with hash: ${txHash.slice(0, 10)}...`,
      })

      // Reset form after successful submission
      setTimeout(() => {
        setTo("")
        setValue("")
        setData("")
        onClose()
      }, 2000)
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, isError: true })
      toast({
        title: "Transaction Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Transaction</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="recipient-address">Recipient Address</Label>
            <Input
              id="recipient-address"
              placeholder="0x..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (MON)</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              placeholder="0.000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="advanced-toggle"
              checked={showAdvanced}
              onCheckedChange={(checked) => setShowAdvanced(!!checked)}
              disabled={isSubmitting}
            />
            <Label htmlFor="advanced-toggle" className="text-sm font-normal">
              Show Advanced Options
            </Label>
          </div>

          {showAdvanced && (
            <div className="grid gap-2">
              <Label htmlFor="transaction-data">Data (Optional)</Label>
              <Textarea
                id="transaction-data"
                placeholder="0x..."
                value={data}
                onChange={(e) => setData(e.target.value)}
                disabled={isSubmitting}
                className="h-20"
              />
            </div>
          )}

          {status && (
            <div
              className={`p-3 rounded-lg ${
                status.isError ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
              } dark:${status.isError ? "bg-red-900/30 text-red-300" : "bg-green-900/30 text-green-300"}`}
            >
              {status.message}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Transaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
