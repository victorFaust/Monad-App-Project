import { ethers } from "ethers"

// Default RPC URL for Monad Testnet
const DEFAULT_RPC_URL = "https://testnet-rpc.monad.xyz"

// Validate if a string is a valid URL with http/https protocol
function isValidRpcUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === "http:" || urlObj.protocol === "https:"
  } catch (e) {
    return false
  }
}

// Get a valid RPC URL, with fallbacks
function getValidRpcUrl(): string {
  // Try environment variable first
  const envRpcUrl = process.env.MONAD_TESTNET_RPC

  // Validate the URL from environment variable
  if (envRpcUrl && isValidRpcUrl(envRpcUrl)) {
    console.log("Server using MONAD_TESTNET_RPC:", envRpcUrl)
    return envRpcUrl
  }

  // Fall back to default RPC URL
  console.log("Server using default RPC URL:", DEFAULT_RPC_URL)
  return DEFAULT_RPC_URL
}

// Initialize provider with retry logic
function createProvider() {
  try {
    const rpcUrl = getValidRpcUrl()
    console.log(`Server initializing provider with RPC URL: ${rpcUrl}`)

    // Create provider with more options for stability
    const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true,
      polling: true,
      pollingInterval: 4000,
      batchMaxCount: 1, // Disable batching for debugging
    })

    return provider
  } catch (error) {
    console.error("Failed to create provider:", error)
    throw error
  }
}

// Initialize provider with the Monad Testnet RPC URL
// Use a function to create the provider to allow for better error handling
let provider: ethers.JsonRpcProvider
try {
  provider = createProvider()
} catch (error) {
  console.error("Failed to initialize provider on module load:", error)
  // We'll create the provider on demand if it fails here
}

// Create a wallet instance from the private key (server-side only)
let wallet: ethers.Wallet | null = null

// This function should only be called in server-side code
export function getWallet() {
  if (!wallet && typeof process !== "undefined" && process.env.PRIVATE_KEY) {
    try {
      // Make sure provider is initialized
      if (!provider) {
        provider = createProvider()
      }
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
    } catch (error) {
      console.error("Failed to initialize wallet:", error)
      throw error
    }
  }
  return wallet
}

// Safe to use on client-side
export function getProvider() {
  // Make sure provider is initialized
  if (!provider) {
    provider = createProvider()
  }
  return provider
}

// Get network information
export async function getNetwork() {
  try {
    // Make sure provider is initialized
    if (!provider) {
      provider = createProvider()
    }

    const network = await provider.getNetwork()
    return {
      name: network.name || "Monad Testnet",
      chainId: network.chainId.toString(),
    }
  } catch (error) {
    console.error("Failed to get network:", error)
    throw error
  }
}

// Get current block number
export async function getBlockNumber() {
  try {
    // Make sure provider is initialized
    if (!provider) {
      provider = createProvider()
    }

    const blockNumber = await provider.getBlockNumber()
    return blockNumber.toString()
  } catch (error) {
    console.error("Failed to get block number:", error)
    throw error
  }
}

// Get gas price
export async function getGasPrice() {
  try {
    // Make sure provider is initialized
    if (!provider) {
      provider = createProvider()
    }

    const gasPrice = await provider.getFeeData()
    // Convert to Gwei for display
    const gasPriceGwei = ethers.formatUnits(gasPrice.gasPrice || 0, "gwei")
    return {
      gasPrice: gasPrice.gasPrice?.toString() || "0",
      gasPriceGwei,
    }
  } catch (error) {
    console.error("Failed to get gas price:", error)
    throw error
  }
}

// Get account balance
export async function getAccountBalance(address: string) {
  try {
    // Make sure provider is initialized
    if (!provider) {
      provider = createProvider()
    }

    const balance = await provider.getBalance(address)
    return {
      wei: balance.toString(),
      ether: ethers.formatEther(balance),
    }
  } catch (error) {
    console.error(`Failed to get balance for ${address}:`, error)
    throw error
  }
}

// Send transaction
export async function sendTransaction(to: string, value: string, data = "0x") {
  try {
    const walletInstance = getWallet()
    if (!walletInstance) {
      throw new Error("Wallet not initialized")
    }

    const tx = await walletInstance.sendTransaction({
      to,
      value: ethers.parseEther(value),
      data,
    })

    return {
      transactionHash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
    }
  } catch (error) {
    console.error("Failed to send transaction:", error)
    throw error
  }
}

// Get transaction receipt
export async function getTransactionReceipt(txHash: string) {
  try {
    // Make sure provider is initialized
    if (!provider) {
      provider = createProvider()
    }

    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt) {
      throw new Error("Transaction not found or pending")
    }
    return receipt
  } catch (error) {
    console.error(`Failed to get receipt for ${txHash}:`, error)
    throw error
  }
}

// Call contract method (read-only)
export async function callContractMethod(contractAddress: string, abi: any[], methodName: string, params: any[] = []) {
  try {
    // Make sure provider is initialized
    if (!provider) {
      provider = createProvider()
    }

    const contract = new ethers.Contract(contractAddress, abi, provider)
    const result = await contract[methodName](...params)
    return result
  } catch (error) {
    console.error(`Failed to call contract method ${methodName}:`, error)
    throw error
  }
}

// Send contract transaction (write)
export async function sendContractTransaction(
  contractAddress: string,
  abi: any[],
  methodName: string,
  params: any[] = [],
) {
  try {
    const walletInstance = getWallet()
    if (!walletInstance) {
      throw new Error("Wallet not initialized")
    }

    const contract = new ethers.Contract(contractAddress, abi, walletInstance)
    const tx = await contract[methodName](...params)
    const receipt = await tx.wait()

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status === 1,
    }
  } catch (error) {
    console.error(`Failed to send contract transaction ${methodName}:`, error)
    throw error
  }
}

// Deploy contract
export async function deployContract(abi: any[], bytecode: string, constructorArgs: any[] = []) {
  try {
    const walletInstance = getWallet()
    if (!walletInstance) {
      throw new Error("Wallet not initialized")
    }

    const factory = new ethers.ContractFactory(abi, bytecode, walletInstance)
    const contract = await factory.deploy(...constructorArgs)
    const receipt = await contract.deploymentTransaction()?.wait()

    return {
      contractAddress: await contract.getAddress(),
      transactionHash: receipt?.hash || "",
      blockNumber: receipt?.blockNumber.toString() || "",
      gasUsed: receipt?.gasUsed.toString() || "",
    }
  } catch (error) {
    console.error("Failed to deploy contract:", error)
    throw error
  }
}
