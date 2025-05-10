"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle } from "lucide-react"
import { transferNft, type NftItem } from "@/lib/nft-service"
import { getClientSigner } from "@/lib/client-blockchain"
import type { WalletInfo } from "@/types/wallet"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NftTransferModalProps {
  isOpen: boolean
  onClose: () => void
  nft: NftItem | null
  wallet: WalletInfo | null
  onTransferComplete?: () => void
}

export function NftTransferModal({ isOpen, onClose, nft, wallet, onTransferComplete }: NftTransferModalProps) {
  const [recipientAddress, setRecipientAddress] = useState("")
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferResult, setTransferResult] = useState<{
    success: boolean
    message: string
    txHash?: string
  } | null>(null)

  const handleTransfer = async () => {
    if (!nft || !wallet || !recipientAddress) return

    setIsTransferring(true)
    setTransferResult(null)

    try {
      const signer = await getClientSigner()
      if (!signer) {
        throw new Error("Failed to get signer")
      }

      const result = await transferNft(wallet.address, recipientAddress, nft.collection.address, nft.tokenId, signer)

      if (result.success) {
        setTransferResult({
          success: true,
          message: "NFT transferred successfully!",
          txHash: result.txHash,
        })
        // Call the onTransferComplete callback after a successful transfer
        if (onTransferComplete) {
          setTimeout(onTransferComplete, 2000)
        }
      } else {
        setTransferResult({
          success: false,
          message: result.error || "Transfer failed",
        })
      }
    } catch (error: any) {
      console.error("Transfer error:", error)
      setTransferResult({
        success: false,
        message: error.message || "An unexpected error occurred",
      })
    } finally {
      setIsTransferring(false)
    }
  }

  const handleClose = () => {
    if (!isTransferring) {
      setRecipientAddress("")
      setTransferResult(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer NFT</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {nft && (
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                <img
                  src={nft.image || "/placeholder.svg?height=200&width=200&query=nft%20art"}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-medium">{nft.name}</h3>
                <p className="text-sm text-muted-foreground">{nft.collection.name}</p>
              </div>
            </div>
          )}

          {transferResult && (
            <Alert variant={transferResult.success ? "default" : "destructive"}>
              {!transferResult.success && <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{transferResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              disabled={isTransferring || transferResult?.success}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isTransferring}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={!recipientAddress || isTransferring || transferResult?.success}>
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                "Transfer NFT"
              )}
            </Button>
          </div>

          {transferResult?.success && transferResult.txHash && (
            <div className="text-sm text-center">
              <p>Transaction Hash:</p>
              <p className="font-mono text-xs break-all">{transferResult.txHash}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
