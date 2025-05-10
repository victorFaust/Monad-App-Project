"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowRight, Globe, CreditCard, Banknote, ArrowRightLeft, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ethers } from "ethers"
import type { WalletInfo } from "@/types/wallet"
import { TransactionContext } from "@/contexts/transaction-context"
import { useContext } from "react"

// Bridge contract ABI (simplified)
const BRIDGE_ABI = [
  "function bridgeTokens(uint256 destinationChainId, address recipient, uint256 amount) external payable returns (uint256)",
  "function getBridgeFee(uint256 destinationChainId) external view returns (uint256)",
  "function getDestinationChainStatus(uint256 chainId) external view returns (bool)",
  "event TokensBridged(address indexed sender, uint256 indexed destinationChainId, address indexed recipient, uint256 amount, uint256 fee, uint256 nonce)",
]

// Bridge contract address - using lowercase to avoid checksum issues
const BRIDGE_CONTRACT = "0x8a7f7c5b556b1298a74c0e89df46fd62e8900666"

// Chain IDs for supported networks
const CHAIN_IDS = {
  monad: 1,
  ethereum: 1,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
}

interface CrossChainTransactionProps {
  wallet: WalletInfo | null
}

export function CrossChainTransaction({ wallet }: CrossChainTransactionProps) {
  const { toast } = useToast()
  const { addTransaction } = useContext(TransactionContext)
  const [isLoading, setIsLoading] = useState(false)
  const [bridgeFee, setBridgeFee] = useState<string | null>(null)
  const [chainStatuses, setChainStatuses] = useState<{ [key: string]: boolean }>({})
  const [formData, setFormData] = useState({
    sourceChain: "monad",
    destinationChain: "ethereum",
    recipient: "",
    amount: "",
  })

  // Fetch bridge fees and chain statuses when component mounts or destination changes
  useEffect(() => {
    if (!wallet?.signer) return

    const fetchBridgeInfo = async () => {
      try {
        // Create contract instance without address validation
        const bridgeContract = new ethers.Contract(BRIDGE_CONTRACT, BRIDGE_ABI, wallet.signer)

        // Get bridge fee for selected destination
        const destinationChainId = CHAIN_IDS[formData.destinationChain as keyof typeof CHAIN_IDS]

        try {
          const fee = await bridgeContract.getBridgeFee(destinationChainId)
          setBridgeFee(ethers.formatEther(fee))
        } catch (feeError) {
          console.warn("Failed to get bridge fee:", feeError)
          setBridgeFee("0.001") // Fallback fee
        }

        // Set default statuses first
        const defaultStatuses = {
          monad: true,
          ethereum: true,
          arbitrum: true,
          optimism: true,
          base: true,
        }
        setChainStatuses(defaultStatuses)

        // Try to get actual chain statuses
        try {
          // Get status for all supported chains
          for (const [chain, id] of Object.entries(CHAIN_IDS)) {
            if (chain === "monad") continue // Source chain is always available

            try {
              const status = await bridgeContract.getDestinationChainStatus(id)
              defaultStatuses[chain] = status
            } catch (chainError) {
              console.warn(`Failed to get status for ${chain}:`, chainError)
              // Keep default status
            }
          }

          setChainStatuses({ ...defaultStatuses })
        } catch (statusError) {
          console.warn("Failed to get chain statuses:", statusError)
          // Keep default statuses
        }
      } catch (error) {
        console.error("Failed to fetch bridge information:", error)
        // Set default values if contract call fails
        setBridgeFee("0.001")
        setChainStatuses({
          monad: true,
          ethereum: true,
          arbitrum: true,
          optimism: true,
          base: true,
        })
      }
    }

    fetchBridgeInfo()
  }, [wallet?.signer, formData.destinationChain])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!wallet?.signer) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first to perform cross-chain transactions.",
        variant: "destructive",
      })
      return
    }

    if (!formData.recipient || !formData.amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    // Basic address validation without using ethers.getAddress
    if (!formData.recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create contract instance without address validation
      const bridgeContract = new ethers.Contract(BRIDGE_CONTRACT, BRIDGE_ABI, wallet.signer)

      const destinationChainId = CHAIN_IDS[formData.destinationChain as keyof typeof CHAIN_IDS]
      const amountWei = ethers.parseEther(formData.amount)

      // Get bridge fee
      let fee
      try {
        fee = await bridgeContract.getBridgeFee(destinationChainId)
      } catch (feeError) {
        console.warn("Failed to get bridge fee, using default:", feeError)
        fee = ethers.parseEther("0.001") // Default fee
      }

      // Execute the bridge transaction
      const tx = await bridgeContract.bridgeTokens(
        destinationChainId,
        formData.recipient, // Use recipient address directly
        amountWei,
        { value: fee },
      )

      // Wait for transaction to be mined
      const receipt = await tx.wait()

      // Add to transaction history
      addTransaction({
        hash: receipt.hash,
        from: wallet.address,
        to: BRIDGE_CONTRACT,
        value: `Bridge ${formData.amount} MON to ${formData.destinationChain}`,
        timestamp: Date.now(),
        status: "confirmed",
      })

      toast({
        title: "Cross-Chain Transaction Initiated",
        description: `Sending ${formData.amount} MON from ${formData.sourceChain} to ${formData.destinationChain}. This may take 10-30 minutes to complete.`,
      })

      // Reset form
      setFormData({
        ...formData,
        recipient: "",
        amount: "",
      })
    } catch (error: any) {
      console.error("Cross-chain transaction failed:", error)

      // Provide more specific error messages
      let errorMessage = "Failed to initiate cross-chain transaction. Please try again."

      if (error.message?.includes("bad address")) {
        errorMessage = "Invalid recipient address. Please check the address and try again."
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds to complete this transaction."
      }

      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!wallet) {
    return null
  }

  return (
    <Card className="mt-4">
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Cross-Chain Transaction</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sourceChain" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Source Chain
              </Label>
              <Select
                value={formData.sourceChain}
                onValueChange={(value) => handleSelectChange("sourceChain", value)}
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monad">Monad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="destinationChain" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Destination Chain
              </Label>
              <Select
                value={formData.destinationChain}
                onValueChange={(value) => handleSelectChange("destinationChain", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum" disabled={!chainStatuses.ethereum}>
                    Ethereum {!chainStatuses.ethereum && "(Unavailable)"}
                  </SelectItem>
                  <SelectItem value="arbitrum" disabled={!chainStatuses.arbitrum}>
                    Arbitrum {!chainStatuses.arbitrum && "(Unavailable)"}
                  </SelectItem>
                  <SelectItem value="optimism" disabled={!chainStatuses.optimism}>
                    Optimism {!chainStatuses.optimism && "(Unavailable)"}
                  </SelectItem>
                  <SelectItem value="base" disabled={!chainStatuses.base}>
                    Base {!chainStatuses.base && "(Unavailable)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Recipient Address
            </Label>
            <Input
              id="recipient"
              name="recipient"
              placeholder="0x..."
              value={formData.recipient}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Amount (MON)
            </Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.000001"
              min="0"
              placeholder="0.0"
              value={formData.amount}
              onChange={handleChange}
            />
          </div>

          {bridgeFee && (
            <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 mr-2" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p>Bridge fee: {bridgeFee} MON</p>
                  <p className="mt-1">Estimated completion time: 10-30 minutes</p>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white mr-2"></div>
                Processing...
              </div>
            ) : (
              <div className="flex items-center">
                Send <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
