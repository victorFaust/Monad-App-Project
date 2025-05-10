import { getClientProvider } from "./client-blockchain"
import { ethers } from "ethers"

// ERC-721 standard interface
const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) returns ()",
  "function transferFrom(address from, address to, uint256 tokenId) returns ()",
  "function approve(address to, uint256 tokenId) returns ()",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved) returns ()",
]

// Real NFT collections on Monad with proper checksum addresses
// Using placeholder addresses that will be properly checksummed
const NFT_COLLECTION_ADDRESSES = {
  MONAD_PUNKS: "0x8a7f7c5b556b1298a74c0e89df46fd62e8900666",
  MONAD_APES: "0x7bc06c482dead17c0e297afbc32f6e63d3846650",
  MONAD_CATS: "0x9d8f2df698ef8b5c9681f00c1b7b3e2baa5c7e50",
  MONAD_WIZARDS: "0x3a98250f98dd388c211206983453837c8365bdc1",
}

// Convert addresses to proper checksum format
export const NFT_COLLECTIONS = Object.entries(NFT_COLLECTION_ADDRESSES).reduce(
  (acc, [key, value]) => {
    try {
      acc[key] = ethers.getAddress(value)
    } catch (error) {
      console.error(`Invalid address format for ${key}: ${value}`)
      // Use a fallback valid address if conversion fails
      acc[key] = "0x0000000000000000000000000000000000000000"
    }
    return acc
  },
  {} as Record<string, string>,
)

export interface NftItem {
  id: string
  tokenId: string
  name: string
  description: string
  image: string
  collection: {
    name: string
    address: string
    symbol: string
  }
}

// Helper function to check if a contract exists and implements ERC721
async function isValidERC721Contract(address: string, provider: ethers.Provider): Promise<boolean> {
  try {
    // Check if there's code at the address
    const code = await provider.getCode(address)
    if (code === "0x") return false // No contract at this address

    // Try to call supportsInterface function (ERC165) to check for ERC721 support
    // ERC721 interface ID: 0x80ac58cd
    const contract = new ethers.Contract(
      address,
      ["function supportsInterface(bytes4 interfaceId) view returns (bool)"],
      provider,
    )

    try {
      const supportsERC721 = await contract.supportsInterface("0x80ac58cd")
      return supportsERC721
    } catch (error) {
      // If supportsInterface fails, try to call balanceOf as a fallback check
      const erc721Contract = new ethers.Contract(
        address,
        ["function balanceOf(address) view returns (uint256)"],
        provider,
      )
      await erc721Contract.balanceOf(ethers.ZeroAddress)
      return true
    }
  } catch (error) {
    return false
  }
}

// Helper function to fetch metadata from IPFS or HTTP URL
async function fetchMetadata(uri: string): Promise<any> {
  try {
    // Handle IPFS URLs
    if (uri.startsWith("ipfs://")) {
      const ipfsHash = uri.replace("ipfs://", "")
      uri = `https://ipfs.io/ipfs/${ipfsHash}`
    }

    // Fetch the metadata
    const response = await fetch(uri)
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching metadata:", error)
    throw error
  }
}

// Function to get NFTs for a wallet address
export async function getNftsForWallet(walletAddress: string): Promise<{ nfts: NftItem[]; error?: string }> {
  try {
    const provider = getClientProvider()
    if (!provider) {
      throw new Error("Provider not initialized")
    }

    // Ensure wallet address is properly checksummed
    const checksummedWalletAddress = ethers.getAddress(walletAddress)

    const nfts: NftItem[] = []

    // For each collection, check if the wallet owns any NFTs
    for (const [collectionName, collectionAddress] of Object.entries(NFT_COLLECTIONS)) {
      try {
        // Check if the contract exists and implements ERC721
        const isValidContract = await isValidERC721Contract(collectionAddress, provider)
        if (!isValidContract) {
          console.warn(`Contract at ${collectionAddress} is not a valid ERC721 contract`)
          continue
        }

        const nftContract = new ethers.Contract(collectionAddress, ERC721_ABI, provider)

        // Get the balance (number of NFTs owned)
        const balance = await nftContract.balanceOf(checksummedWalletAddress)
        const balanceNumber = Number(balance)

        if (balanceNumber > 0) {
          // Get collection info
          const [name, symbol] = await Promise.all([nftContract.name(), nftContract.symbol()])

          // For each owned token, get the token ID and metadata
          for (let i = 0; i < balanceNumber; i++) {
            try {
              // Get token ID
              const tokenId = await nftContract.tokenOfOwnerByIndex(checksummedWalletAddress, i)

              // Get token URI
              const tokenURI = await nftContract.tokenURI(tokenId)

              // Fetch metadata
              const metadata = await fetchMetadata(tokenURI)

              if (metadata) {
                // Process image URL
                let imageUrl = metadata.image || ""
                if (imageUrl.startsWith("ipfs://")) {
                  const ipfsHash = imageUrl.replace("ipfs://", "")
                  imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`
                }

                // Add to NFTs array
                nfts.push({
                  id: `${collectionAddress.toLowerCase()}-${tokenId.toString()}`,
                  tokenId: tokenId.toString(),
                  name: metadata.name || `${name} #${tokenId.toString()}`,
                  description: metadata.description || "",
                  image: imageUrl,
                  collection: {
                    name,
                    address: collectionAddress,
                    symbol,
                  },
                })
              }
            } catch (error) {
              console.error(`Error processing NFT ${i} from collection ${collectionName}:`, error)
            }
          }
        }
      } catch (error) {
        console.error(`Error checking collection ${collectionName}:`, error)
      }
    }

    return { nfts }
  } catch (error: any) {
    console.error("Failed to fetch NFTs:", error)
    return {
      nfts: [],
      error: error.message || "Failed to fetch NFTs",
    }
  }
}

// Function to get a specific NFT by collection address and token ID
export async function getNftDetails(
  collectionAddress: string,
  tokenId: string,
): Promise<{ nft: NftItem | null; error?: string }> {
  try {
    const provider = getClientProvider()
    if (!provider) {
      throw new Error("Provider not initialized")
    }

    // Ensure collection address is properly checksummed
    const checksummedCollectionAddress = ethers.getAddress(collectionAddress)

    // Check if the contract exists and implements ERC721
    const isValidContract = await isValidERC721Contract(checksummedCollectionAddress, provider)
    if (!isValidContract) {
      throw new Error("Not a valid ERC721 contract")
    }

    const nftContract = new ethers.Contract(checksummedCollectionAddress, ERC721_ABI, provider)

    // Check if the token exists by trying to get its owner
    try {
      await nftContract.ownerOf(tokenId)
    } catch (error) {
      throw new Error("Token does not exist")
    }

    // Get collection info
    const [name, symbol, tokenURI] = await Promise.all([
      nftContract.name(),
      nftContract.symbol(),
      nftContract.tokenURI(tokenId),
    ])

    // Fetch metadata
    const metadata = await fetchMetadata(tokenURI)

    if (!metadata) {
      throw new Error("Failed to fetch token metadata")
    }

    // Process image URL
    let imageUrl = metadata.image || ""
    if (imageUrl.startsWith("ipfs://")) {
      const ipfsHash = imageUrl.replace("ipfs://", "")
      imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`
    }

    return {
      nft: {
        id: `${checksummedCollectionAddress.toLowerCase()}-${tokenId}`,
        tokenId,
        name: metadata.name || `${name} #${tokenId}`,
        description: metadata.description || "",
        image: imageUrl,
        collection: {
          name,
          address: checksummedCollectionAddress,
          symbol,
        },
      },
    }
  } catch (error: any) {
    console.error("Failed to fetch NFT details:", error)
    return {
      nft: null,
      error: error.message || "Failed to fetch NFT details",
    }
  }
}

// Function to check if an address owns a specific NFT
export async function checkNftOwnership(
  walletAddress: string,
  collectionAddress: string,
  tokenId: string,
): Promise<{ isOwner: boolean; error?: string }> {
  try {
    const provider = getClientProvider()
    if (!provider) {
      throw new Error("Provider not initialized")
    }

    // Ensure addresses are properly checksummed
    const checksummedWalletAddress = ethers.getAddress(walletAddress)
    const checksummedCollectionAddress = ethers.getAddress(collectionAddress)

    // Check if the contract exists and implements ERC721
    const isValidContract = await isValidERC721Contract(checksummedCollectionAddress, provider)
    if (!isValidContract) {
      throw new Error("Not a valid ERC721 contract")
    }

    const nftContract = new ethers.Contract(checksummedCollectionAddress, ERC721_ABI, provider)

    // Get the current owner of the token
    const owner = await nftContract.ownerOf(tokenId)

    // Check if the wallet is the owner
    return {
      isOwner: owner.toLowerCase() === checksummedWalletAddress.toLowerCase(),
    }
  } catch (error: any) {
    console.error("Failed to check NFT ownership:", error)
    return {
      isOwner: false,
      error: error.message || "Failed to check NFT ownership",
    }
  }
}

// Function to transfer an NFT to another address
export async function transferNft(
  fromAddress: string,
  toAddress: string,
  collectionAddress: string,
  tokenId: string,
  signer: ethers.Signer,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Validate addresses
    if (!ethers.isAddress(fromAddress) || !ethers.isAddress(toAddress) || !ethers.isAddress(collectionAddress)) {
      throw new Error("Invalid address format")
    }

    const provider = await signer.provider
    if (!provider) {
      throw new Error("Provider not available")
    }

    const checksummedFromAddress = ethers.getAddress(fromAddress)
    const checksummedToAddress = ethers.getAddress(toAddress)
    const checksummedCollectionAddress = ethers.getAddress(collectionAddress)

    // Validate token ID
    if (!tokenId || isNaN(Number(tokenId))) {
      throw new Error("Invalid token ID")
    }

    // Check if the contract exists and implements ERC721
    const isValidContract = await isValidERC721Contract(checksummedCollectionAddress, provider)
    if (!isValidContract) {
      throw new Error("Not a valid ERC721 contract")
    }

    // Create contract instance
    const nftContract = new ethers.Contract(checksummedCollectionAddress, ERC721_ABI, signer)

    // Check if the sender is the owner
    const owner = await nftContract.ownerOf(tokenId)
    if (owner.toLowerCase() !== checksummedFromAddress.toLowerCase()) {
      throw new Error("You don't own this NFT")
    }

    // Check if the contract is approved to transfer
    const signerAddress = await signer.getAddress()
    const isApprovedForAll = await nftContract.isApprovedForAll(checksummedFromAddress, signerAddress)
    const approvedAddress = await nftContract.getApproved(tokenId)
    const isApproved = approvedAddress.toLowerCase() === signerAddress.toLowerCase()

    // If not approved, approve first
    if (!isApprovedForAll && !isApproved) {
      const approveTx = await nftContract.approve(signerAddress, tokenId)
      await approveTx.wait()
    }

    // Transfer the NFT
    const tx = await nftContract.transferFrom(checksummedFromAddress, checksummedToAddress, tokenId)
    const receipt = await tx.wait()

    return {
      success: true,
      txHash: receipt.hash,
    }
  } catch (error: any) {
    console.error("Failed to transfer NFT:", error)
    return {
      success: false,
      error: error.message || "Failed to transfer NFT",
    }
  }
}
