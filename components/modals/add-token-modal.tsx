"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { addCustomToken, getTokenInfo } from "@/lib/token-service"

interface AddTokenModalProps {
  isOpen: boolean
  onClose: () => void
  onTokenAdded?: () => void
}

export function AddTokenModal({ isOpen, onClose, onTokenAdded }: AddTokenModalProps) {
  const { toast } = useToast()
  const [tokenAddress, setTokenAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [customLogoUrl, setCustomLogoUrl] = useState("")

  const handleAddToken = async () => {
    if (!ethers.isAddress(tokenAddress)) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid token contract address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Try to get token info from the blockchain
      const tokenInfo = await getTokenInfo(tokenAddress)

      // Add custom logo if provided
      if (customLogoUrl) {
        tokenInfo.logoURI = customLogoUrl
      }

      // Add the token to our list
      addCustomToken(tokenInfo)

      toast({
        title: "Token added",
        description: `${tokenInfo.name} (${tokenInfo.symbol}) has been added to your token list`,
      })

      // Close the modal and refresh
      onClose()
      onTokenAdded && onTokenAdded()
    } catch (error: any) {
      console.error("Failed to add token:", error)

      toast({
        title: "Failed to add token",
        description: error.message || "Could not retrieve token information from the blockchain",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Token</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Token Address */}
          <div className="space-y-2">
            <Label htmlFor="token-address">Token Contract Address</Label>
            <Input
              id="token-address"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>

          {/* Custom Logo URL (optional) */}
          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo URL (optional)</Label>
            <Input
              id="logo-url"
              value={customLogoUrl}
              onChange={(e) => setCustomLogoUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-gray-500">Provide a URL to a square image for the token logo (optional)</p>
          </div>

          {/* Add button */}
          <Button className="w-full" onClick={handleAddToken} disabled={isLoading || !tokenAddress}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-white"></div>
                Adding Token...
              </div>
            ) : (
              "Add Token"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
