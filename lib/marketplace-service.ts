import { ethers } from "ethers"
import { getClientProvider } from "./client-blockchain"
import type { NftItem } from "./nft-service"
import { getNftDetails } from "./nft-service"

// Marketplace contract ABI
const MARKETPLACE_ABI = [
  "function createListing(address nftContract, uint256 tokenId, uint256 price) returns (uint256)",
  "function cancelListing(uint256 listingId) returns (bool)",
  "function buyNft(uint256 listingId) payable returns (bool)",
  "function getListingPrice(uint256 listingId) view returns (uint256)",
  "function getListingDetails(uint256 listingId) view returns (address seller, address nftContract, uint256 tokenId, uint256 price, bool active)",
  "function getListingsByUser(address user) view returns (uint256[])",
  "function getActiveListings() view returns (uint256[])",
  "event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price)",
  "event ListingCancelled(uint256 indexed listingId)",
  "event ListingSold(uint256 indexed listingId, address buyer, uint256 price)",
]

// Marketplace contract address (replace with actual deployed contract)
export const MARKETPLACE_ADDRESS = "0x5387C85A4965769f6B0Df430638a1388493486F1"

// Listing interface
export interface NftListing {
  id: string
  nft: NftItem
  price: string
  seller: string
  active: boolean
  createdAt: number
}

// Mock listings for development/fallback
const MOCK_LISTINGS: NftListing[] = [
  {
    id: "1",
    nft: {
      id: "1",
      tokenId: "1",
      name: "Neon Rebel",
      description: "A cyberpunk character with neon accents",
      image: "/neon-rebel.png",
      collection: {
        name: "Cyber Punks",
        address: "0x1234567890123456789012345678901234567890",
      },
      owner: "0xabcdef1234567890abcdef1234567890abcdef12",
    },
    price: "0.5",
    seller: "0xabcdef1234567890abcdef1234567890abcdef12",
    active: true,
    createdAt: Date.now() - 86400000, // 1 day ago
  },
  {
    id: "2",
    nft: {
      id: "2",
      tokenId: "2",
      name: "Cybernetic Simian",
      description: "A futuristic monkey with cybernetic enhancements",
      image: "/cybernetic-simian.png",
      collection: {
        name: "Cyber Punks",
        address: "0x1234567890123456789012345678901234567890",
      },
      owner: "0x0987654321098765432109876543210987654321",
    },
    price: "0.75",
    seller: "0x0987654321098765432109876543210987654321",
    active: true,
    createdAt: Date.now() - 43200000, // 12 hours ago
  },
  {
    id: "3",
    nft: {
      id: "3",
      tokenId: "3",
      name: "Cybernetic Feline",
      description: "A futuristic cat with cybernetic enhancements",
      image: "/cybernetic-feline.png",
      collection: {
        name: "Cyber Punks",
        address: "0x1234567890123456789012345678901234567890",
      },
      owner: "0xabcdef1234567890abcdef1234567890abcdef12",
    },
    price: "0.6",
    seller: "0xabcdef1234567890abcdef1234567890abcdef12",
    active: true,
    createdAt: Date.now() - 21600000, // 6 hours ago
  },
  {
    id: "4",
    nft: {
      id: "4",
      tokenId: "4",
      name: "Arcane Illuminator",
      description: "A mystical character with arcane powers",
      image: "/arcane-illuminator.png",
      collection: {
        name: "Mystic Mages",
        address: "0x0987654321098765432109876543210987654321",
      },
      owner: "0x0987654321098765432109876543210987654321",
    },
    price: "1.2",
    seller: "0x0987654321098765432109876543210987654321",
    active: true,
    createdAt: Date.now() - 10800000, // 3 hours ago
  },
]

// Get all active listings
export async function getActiveListings(): Promise<NftListing[]> {
  try {
    const provider = getClientProvider()
    if (!provider) {
      console.warn("Provider not initialized, using mock data")
      return MOCK_LISTINGS
    }

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider)

      // Try to get active listing IDs
      const listingIds = await marketplace.getActiveListings()

      // Get details for each listing
      const listings: NftListing[] = []

      for (const listingId of listingIds) {
        try {
          // Get listing details
          const [seller, nftContract, tokenId, price, active] = await marketplace.getListingDetails(listingId)

          if (active) {
            // Get NFT details
            const nft = await getNftDetails(nftContract, tokenId.toString())

            if (nft) {
              listings.push({
                id: listingId.toString(),
                nft,
                price: ethers.formatEther(price),
                seller,
                active,
                createdAt: Date.now(), // We don't have creation time from contract, use current time
              })
            }
          }
        } catch (error) {
          console.error(`Error processing listing ${listingId}:`, error)
        }
      }

      return listings
    } catch (error) {
      console.warn("Contract call failed, using mock data:", error)
      return MOCK_LISTINGS
    }
  } catch (error) {
    console.error("Failed to fetch active listings:", error)
    // Return mock data as fallback
    return MOCK_LISTINGS
  }
}

// Get listings by a specific user
export async function getUserListings(userAddress: string): Promise<NftListing[]> {
  try {
    const provider = getClientProvider()
    if (!provider) {
      console.warn("Provider not initialized, using filtered mock data")
      return MOCK_LISTINGS.filter((listing) => listing.seller.toLowerCase() === userAddress.toLowerCase())
    }

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider)

      // Get all listing IDs for this user
      const listingIds = await marketplace.getListingsByUser(userAddress)

      // Get details for each listing
      const listings: NftListing[] = []

      for (const listingId of listingIds) {
        try {
          // Get listing details
          const [seller, nftContract, tokenId, price, active] = await marketplace.getListingDetails(listingId)

          // Verify this is the correct user
          if (seller.toLowerCase() === userAddress.toLowerCase()) {
            // Get NFT details
            const nft = await getNftDetails(nftContract, tokenId.toString())

            if (nft) {
              listings.push({
                id: listingId.toString(),
                nft,
                price: ethers.formatEther(price),
                seller,
                active,
                createdAt: Date.now(), // We don't have creation time from contract, use current time
              })
            }
          }
        } catch (error) {
          console.error(`Error processing listing ${listingId}:`, error)
        }
      }

      return listings
    } catch (error) {
      console.warn("Contract call failed, using filtered mock data:", error)
      return MOCK_LISTINGS.filter((listing) => listing.seller.toLowerCase() === userAddress.toLowerCase())
    }
  } catch (error) {
    console.error(`Failed to fetch listings for user ${userAddress}:`, error)
    // Return filtered mock data as fallback
    return MOCK_LISTINGS.filter((listing) => listing.seller.toLowerCase() === userAddress.toLowerCase())
  }
}

// Create a new listing
export async function createListing(
  nftContract: string,
  tokenId: string,
  price: string,
  signer: ethers.Signer,
): Promise<{ success: boolean; listingId?: string; error?: string }> {
  try {
    // Validate inputs
    if (!ethers.isAddress(nftContract)) {
      throw new Error("Invalid NFT contract address")
    }

    if (!tokenId || isNaN(Number(tokenId))) {
      throw new Error("Invalid token ID")
    }

    const priceValue = Number.parseFloat(price)
    if (isNaN(priceValue) || priceValue <= 0) {
      throw new Error("Price must be greater than 0")
    }

    // Create marketplace contract instance
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer)

    // Create NFT contract instance to approve marketplace
    const nftAbi = [
      "function approve(address to, uint256 tokenId) external",
      "function getApproved(uint256 tokenId) external view returns (address)",
      "function ownerOf(uint256 tokenId) external view returns (address)",
    ]
    const nftContractInstance = new ethers.Contract(nftContract, nftAbi, signer)

    // Check if the user owns the NFT
    const owner = await nftContractInstance.ownerOf(tokenId)
    const signerAddress = await signer.getAddress()

    if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new Error("You don't own this NFT")
    }

    // Check if the marketplace is approved to transfer the NFT
    const approved = await nftContractInstance.getApproved(tokenId)

    if (approved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
      // Approve the marketplace to transfer the NFT
      const approveTx = await nftContractInstance.approve(MARKETPLACE_ADDRESS, tokenId)
      await approveTx.wait()
    }

    // Create the listing
    const priceWei = ethers.parseEther(price)
    const tx = await marketplace.createListing(nftContract, tokenId, priceWei)
    const receipt = await tx.wait()

    // Find the ListingCreated event to get the listing ID
    const event = receipt.logs
      .filter((log: any) => log.address.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase())
      .map((log: any) => {
        try {
          return marketplace.interface.parseLog(log)
        } catch (e) {
          return null
        }
      })
      .find((event: any) => event && event.name === "ListingCreated")

    if (!event) {
      throw new Error("Listing created but event not found")
    }

    const listingId = event.args[0].toString()

    return {
      success: true,
      listingId,
    }
  } catch (error: any) {
    console.error("Failed to create listing:", error)
    return {
      success: false,
      error: error.message || "Failed to create listing",
    }
  }
}

// Cancel a listing
export async function cancelListing(
  listingId: string,
  signer: ethers.Signer,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate listing ID
    if (!listingId) {
      throw new Error("Invalid listing ID")
    }

    // Create marketplace contract instance
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer)

    // Get listing details to verify ownership
    const [seller, , , , active] = await marketplace.getListingDetails(listingId)

    // Check if the listing is active
    if (!active) {
      throw new Error("Listing is not active")
    }

    // Check if the user is the seller
    const signerAddress = await signer.getAddress()
    if (seller.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new Error("You are not the seller of this listing")
    }

    // Cancel the listing
    const tx = await marketplace.cancelListing(listingId)
    await tx.wait()

    return { success: true }
  } catch (error: any) {
    console.error(`Failed to cancel listing ${listingId}:`, error)
    return {
      success: false,
      error: error.message || "Failed to cancel listing",
    }
  }
}

// Buy an NFT
export async function buyNft(
  listingId: string,
  price: string,
  signer: ethers.Signer,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // For development/testing, simulate a successful purchase
    if (MOCK_LISTINGS.some((listing) => listing.id === listingId)) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      return {
        success: true,
        txHash:
          "0x" +
          Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join(""),
      }
    }

    // Validate listing ID
    if (!listingId) {
      throw new Error("Invalid listing ID")
    }

    // Create marketplace contract instance
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer)

    // Get listing details
    const [seller, , , listingPrice, active] = await marketplace.getListingDetails(listingId)

    // Check if the listing is active
    if (!active) {
      throw new Error("Listing is not active")
    }

    // Check if the price matches
    const priceWei = ethers.parseEther(price)
    if (priceWei.toString() !== listingPrice.toString()) {
      throw new Error("Price mismatch. The listing price may have changed.")
    }

    // Check if the user is not the seller
    const signerAddress = await signer.getAddress()
    if (seller.toLowerCase() === signerAddress.toLowerCase()) {
      throw new Error("You cannot buy your own listing")
    }

    // Buy the NFT
    const tx = await marketplace.buyNft(listingId, { value: priceWei })
    const receipt = await tx.wait()

    return {
      success: true,
      txHash: receipt.hash,
    }
  } catch (error: any) {
    console.error(`Failed to buy NFT from listing ${listingId}:`, error)
    return {
      success: false,
      error: error.message || "Failed to buy NFT",
    }
  }
}

// Get listing details
export async function getListingDetails(listingId: string): Promise<NftListing | null> {
  try {
    // For development/testing, return mock listing if it exists
    const mockListing = MOCK_LISTINGS.find((listing) => listing.id === listingId)
    if (mockListing) {
      return mockListing
    }

    const provider = getClientProvider()
    if (!provider) {
      throw new Error("Provider not initialized")
    }

    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider)

    // Get listing details
    const [seller, nftContractAddress, tokenId, price, active] = await marketplace.getListingDetails(listingId)

    // Get NFT details
    const nft = await getNftDetails(nftContractAddress, tokenId.toString())

    if (!nft) {
      throw new Error("NFT details not found")
    }

    return {
      id: listingId,
      nft,
      price: ethers.formatEther(price),
      seller,
      active,
      createdAt: Date.now(), // We don't have creation time from contract, use current time
    }
  } catch (error) {
    console.error(`Failed to get details for listing ${listingId}:`, error)
    return null
  }
}
