"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, RefreshCw, ShoppingCart, Tag, Store, Search, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { getActiveListings, getUserListings, buyNft, type NftListing } from "@/lib/marketplace-service"
import type { WalletInfo } from "@/types/wallet"
import { SellNftModal } from "@/components/modals/sell-nft-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NftMarketplaceProps {
  wallet: WalletInfo | null
}

export function NftMarketplace({ wallet }: NftMarketplaceProps) {
  const [activeListings, setActiveListings] = useState<NftListing[]>([])
  const [userListings, setUserListings] = useState<NftListing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUserListingsLoading, setIsUserListingsLoading] = useState(false)
  const [selectedListing, setSelectedListing] = useState<NftListing | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isSellModalOpen, setIsSellModalOpen] = useState(false)
  const [isBuying, setIsBuying] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const { toast } = useToast()

  // Fetch active listings
  const fetchActiveListings = async () => {
    setIsLoading(true)
    setIsUsingMockData(false)
    try {
      const listings = await getActiveListings()
      setActiveListings(listings)

      // Check if we're using mock data (this is a heuristic)
      if (listings.length > 0 && listings[0].nft.image?.startsWith("/")) {
        setIsUsingMockData(true)
      }
    } catch (error) {
      console.error("Failed to fetch marketplace listings:", error)
      toast({
        title: "Error",
        description: "Failed to load marketplace listings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch user's listings
  const fetchUserListings = async () => {
    if (!wallet?.address) return

    setIsUserListingsLoading(true)
    try {
      const listings = await getUserListings(wallet.address)
      setUserListings(listings)
    } catch (error) {
      console.error("Failed to fetch user listings:", error)
    } finally {
      setIsUserListingsLoading(false)
    }
  }

  // Initial data loading
  useEffect(() => {
    fetchActiveListings()
  }, [])

  // Load user listings when wallet changes
  useEffect(() => {
    if (wallet?.address) {
      fetchUserListings()
    } else {
      setUserListings([])
    }
  }, [wallet?.address])

  // Handle listing click
  const handleListingClick = (listing: NftListing) => {
    setSelectedListing(listing)
    setIsDetailDialogOpen(true)
  }

  // Handle buy NFT
  const handleBuyNft = async () => {
    if (!wallet?.signer || !selectedListing) {
      toast({
        title: "Error",
        description: "Wallet not connected or no listing selected",
        variant: "destructive",
      })
      return
    }

    setIsBuying(true)
    try {
      const result = await buyNft(selectedListing.id, selectedListing.price, wallet.signer)

      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully purchased ${selectedListing.nft.name}!`,
        })

        // Close dialog and refresh listings
        setIsDetailDialogOpen(false)
        fetchActiveListings()
        fetchUserListings()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to purchase NFT",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase NFT",
        variant: "destructive",
      })
    } finally {
      setIsBuying(false)
    }
  }

  // Handle sell completion
  const handleSellComplete = () => {
    fetchActiveListings()
    fetchUserListings()
  }

  // Filter listings based on search query
  const filteredListings = activeListings.filter(
    (listing) =>
      listing.nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.nft.collection.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (!wallet) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle>NFT Marketplace</CardTitle>
          </div>
          <CardDescription>Connect your wallet to access the NFT marketplace</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>NFT Marketplace</CardTitle>
              <CardDescription>Buy and sell NFTs on Monad</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSellModalOpen(true)}>
              <Tag className="h-4 w-4 mr-2" />
              Sell NFT
            </Button>
            <Button variant="outline" size="icon" onClick={fetchActiveListings} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isUsingMockData && (
          <Alert className="mb-4" variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Using demo data. The marketplace contract is not available on this network.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="browse">
          <TabsList className="mb-4">
            <TabsTrigger value="browse">Browse Marketplace</TabsTrigger>
            <TabsTrigger value="my-listings">My Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            <div className="mb-4 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search NFTs by name or collection..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleListingClick(listing)}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={listing.nft.image || "/placeholder.svg"}
                        alt={listing.nft.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            listing.nft.name,
                          )}&background=random&size=200`
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-sm font-medium">
                        {listing.price} MON
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium truncate">{listing.nft.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{listing.nft.collection.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No listings found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-listings">
            {isUserListingsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : userListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {userListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleListingClick(listing)}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={listing.nft.image || "/placeholder.svg"}
                        alt={listing.nft.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-sm font-medium">
                        {listing.price} MON
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium truncate">{listing.nft.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{listing.nft.collection.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You don't have any active listings</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsSellModalOpen(true)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Sell an NFT
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* NFT Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedListing?.nft.name}</DialogTitle>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-4">
              <div className="aspect-square relative rounded-lg overflow-hidden">
                <img
                  src={selectedListing.nft.image || "/placeholder.svg"}
                  alt={selectedListing.nft.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Description</h3>
                <p className="text-sm">{selectedListing.nft.description}</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Collection</div>
                  <div>{selectedListing.nft.collection.name}</div>
                  <div className="text-muted-foreground">Token ID</div>
                  <div>{selectedListing.nft.tokenId}</div>
                  <div className="text-muted-foreground">Price</div>
                  <div className="font-medium">{selectedListing.price} MON</div>
                  <div className="text-muted-foreground">Seller</div>
                  <div className="truncate">{selectedListing.seller}</div>
                </div>
              </div>
              <div className="flex justify-end">
                {selectedListing.seller.toLowerCase() === wallet.address.toLowerCase() ? (
                  <Button variant="outline" className="flex items-center gap-2">
                    Cancel Listing
                  </Button>
                ) : (
                  <Button className="flex items-center gap-2" onClick={handleBuyNft} disabled={isBuying}>
                    {isBuying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buying...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        Buy for {selectedListing.price} MON
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sell NFT Modal */}
      <SellNftModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        wallet={wallet}
        onSellComplete={handleSellComplete}
      />
    </Card>
  )
}
