"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, RefreshCw, ImageIcon, ExternalLink, Send, AlertCircle } from "lucide-react"
import { getNftsForWallet, type NftItem } from "@/lib/nft-service"
import { NftTransferModal } from "@/components/modals/nft-transfer-modal"
import type { WalletInfo } from "@/types/wallet"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NftGalleryProps {
  wallet: WalletInfo | null
}

export function NftGallery({ wallet }: NftGalleryProps) {
  const [nfts, setNfts] = useState<NftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNft, setSelectedNft] = useState<NftItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchNfts = async () => {
    if (!wallet?.address) return

    setIsLoading(true)
    setErrorMessage(null)
    try {
      const result = await getNftsForWallet(wallet.address)

      if (result.error) {
        setErrorMessage(result.error)
        setNfts([])
      } else {
        setNfts(result.nfts)
      }
    } catch (error: any) {
      console.error("Failed to fetch NFTs:", error)
      setErrorMessage(error.message || "Failed to load NFTs")
      setNfts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNfts()
  }, [wallet?.address])

  const handleNftClick = (nft: NftItem) => {
    setSelectedNft(nft)
    setIsDialogOpen(true)
  }

  const handleTransferClick = () => {
    setIsDialogOpen(false)
    setIsTransferModalOpen(true)
  }

  const handleTransferComplete = () => {
    // Refresh NFTs after transfer
    fetchNfts()
  }

  if (!wallet) {
    return null
  }

  return (
    <Card className="mt-4" id="nft-gallery">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>NFT Gallery</CardTitle>
              <CardDescription>View your NFTs on Monad</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={fetchNfts} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : nfts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {nfts.map((nft) => (
              <div
                key={nft.id}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleNftClick(nft)}
              >
                <div className="aspect-square relative">
                  <img
                    src={nft.image || "/placeholder.svg?height=400&width=400&query=nft%20art"}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        nft.name,
                      )}&background=random&size=200`
                    }}
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium truncate">{nft.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{nft.collection.name}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No NFTs Found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {errorMessage
                ? "There was an error loading your NFTs. Please try again later."
                : "You don't have any NFTs in your wallet on this network."}
            </p>
            <Button variant="outline" className="mt-4" onClick={fetchNfts} disabled={isLoading}>
              Refresh
            </Button>
          </div>
        )}
      </CardContent>

      {/* NFT Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedNft?.name}</DialogTitle>
          </DialogHeader>
          {selectedNft && (
            <div className="space-y-4">
              <div className="aspect-square relative rounded-lg overflow-hidden">
                <img
                  src={selectedNft.image || "/placeholder.svg?height=400&width=400&query=nft%20art"}
                  alt={selectedNft.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      selectedNft.name,
                    )}&background=random&size=200`
                  }}
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Description</h3>
                <p className="text-sm">{selectedNft.description || "No description available"}</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Collection</div>
                  <div>{selectedNft.collection.name}</div>
                  <div className="text-muted-foreground">Token ID</div>
                  <div>{selectedNft.tokenId}</div>
                  <div className="text-muted-foreground">Contract</div>
                  <div className="truncate">{selectedNft.collection.address}</div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" className="flex items-center gap-2" onClick={handleTransferClick}>
                  <Send className="h-4 w-4" />
                  Transfer
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View on Explorer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* NFT Transfer Modal */}
      <NftTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        nft={selectedNft}
        wallet={wallet}
        onTransferComplete={handleTransferComplete}
      />
    </Card>
  )
}
