"use client"

import { useState, useEffect } from "react"
import { Tag, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createListing } from "@/lib/marketplace-service"
import { getNftsForWallet, type NftItem } from "@/lib/nft-service"
import type { WalletInfo } from "@/types/wallet"

interface SellNftModalProps {
  isOpen: boolean
  onClose: () => void
  wallet: WalletInfo | null
  onSellComplete: () => void
}

export function SellNftModal({ isOpen, onClose, wallet, onSellComplete }: SellNftModalProps) {
  const [nfts, setNfts] = useState<NftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNftId, setSelectedNftId] = useState<string>("")
  const [price, setPrice] = useState<string>("")
  const [isListing, setIsListing] = useState(false)
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null)
  const { toast } = useToast()

  // Fetch user's NFTs
  const fetchUserNfts = async () => {
    if (!wallet?.address) return

    setIsLoading(true)
    try {
      const userNfts = await getNftsForWallet(wallet.address)
      setNfts(userNfts)
    } catch (error) {
      console.error("Failed to fetch user NFTs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load NFTs when modal opens
  useEffect(() => {
    if (isOpen && wallet?.address) {
      fetchUserNfts()
    }
  }, [isOpen, wallet?.address])

  // Reset form
  const resetForm = () => {
    setSelectedNftId("")
    setPrice("")
    setStatus(null)
  }

  // Handle close
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Handle price change
  const handlePriceChange = (value: string) => {
    // Only allow numbers and decimals
    if (/^(\d*\.?\d*)$/.test(value) || value === "") {
      setPrice(value)
    }
  }

  // Handle listing creation
  const handleCreateListing = async () => {
    if (!wallet?.signer) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive",
      })
      return
    }

    if (!selectedNftId) {
      setStatus({
        success: false,
        message: "Please select an NFT to sell",
      })
      return
    }

    const priceValue = Number.parseFloat(price)
    if (isNaN(priceValue) || priceValue <= 0) {
      setStatus({
        success: false,
        message: "Please enter a valid price greater than 0",
      })
      return
    }

    // Find the selected NFT
    const selectedNft = nfts.find((nft) => nft.id === selectedNftId)
    if (!selectedNft) {
      setStatus({
        success: false,
        message: "Selected NFT not found",
      })
      return
    }

    setIsListing(true)
    setStatus(null)

    try {
      const result = await createListing(selectedNft.collection.address, selectedNft.tokenId, price, wallet.signer)

      if (result.success) {
        setStatus({
          success: true,
          message: `Successfully listed ${selectedNft.name} for ${price} MON`,
        })

        toast({
          title: "NFT Listed",
          description: `Successfully listed ${selectedNft.name} for ${price} MON`,
        })

        // Notify parent component
        setTimeout(() => {
          onSellComplete()
          handleClose()
        }, 2000)
      } else {
        setStatus({
          success: false,
          message: result.error || "Failed to list NFT",
        })
      }
    } catch (error: any) {
      setStatus({
        success: false,
        message: error.message || "Failed to list NFT",
      })

      toast({
        title: "Listing Failed",
        description: error.message || "Failed to list NFT",
        variant: "destructive",
      })
    } finally {
      setIsListing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sell NFT</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nft-select">Select NFT</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : nfts.length > 0 ? (
              <Select value={selectedNftId} onValueChange={setSelectedNftId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an NFT to sell" />
                </SelectTrigger>
                <SelectContent>
                  {nfts.map((nft) => (
                    <SelectItem key={nft.id} value={nft.id}>
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                          <img
                            src={nft.image || "/placeholder.svg"}
                            alt={nft.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {nft.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center py-2 text-sm text-muted-foreground">No NFTs found in your wallet</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (MON)</Label>
            <Input
              id="price"
              placeholder="0.00"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              disabled={isListing}
            />
          </div>

          {status && (
            <div
              className={`p-3 rounded-lg flex items-start space-x-2 ${
                status.success
                  ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                  : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
              }`}
            >
              {status.success ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isListing}>
              Cancel
            </Button>
            <Button onClick={handleCreateListing} disabled={isListing || !selectedNftId || !price}>
              {isListing ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Listing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  List for Sale
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
