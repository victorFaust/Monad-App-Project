"use client"

import { ethers } from "ethers"

// Default RPC URL for Monad Testnet
const DEFAULT_RPC_URL = "https://testnet-rpc.monad.xyz"

// Initialize provider with the Monad Testnet RPC URL
let provider: ethers.JsonRpcProvider | null = null
let providerInitAttempted = false
let lastUsedRpcUrl: string | null = null

// Add a request queue and caching system
const requestQueue: (() => Promise<any>)[] = []
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minute cache
let isProcessingQueue = false
let requestCounter = 0
const MAX_REQUESTS_PER_MINUTE = 50

// Add this function to process the request queue with rate limiting
async function processRequestQueue() {
  if (isProcessingQueue) return
  isProcessingQueue = true

  while (requestQueue.length > 0) {
    const request = requestQueue.shift()
    if (request) {
      try {
        await request()
      } catch (error) {
        console.error("Error processing queued request:", error)
      }

      // Add delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  isProcessingQueue = false
}

// Add this function to queue and execute RPC requests with caching
async function queueRequest<T>(cacheKey: string | null, requestFn: () => Promise<T>, maxRetries = 3): Promise<T> {
  // Check cache first if a cache key is provided
  if (cacheKey && requestCache.has(cacheKey)) {
    const cached = requestCache.get(cacheKey)!
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data as T
    }
    // Cache expired, remove it
    requestCache.delete(cacheKey)
  }

  return new Promise((resolve, reject) => {
    const executeRequest = async () => {
      // Implement retry logic with exponential backoff
      let retries = 0
      let lastError: any = null

      while (retries <= maxRetries) {
        try {
          // Track request count for rate limiting
          requestCounter++

          // Reset counter every minute
          setTimeout(() => {
            requestCounter--
          }, 60000)

          // If we're approaching the rate limit, add more delay
          if (requestCounter > MAX_REQUESTS_PER_MINUTE) {
            const delayMs = Math.min(1000 * Math.pow(2, retries), 10000)
            await new Promise((r) => setTimeout(r, delayMs))
          }

          const result = await requestFn()

          // Cache the result if a cache key is provided
          if (cacheKey) {
            requestCache.set(cacheKey, {
              data: result,
              timestamp: Date.now(),
            })
          }

          resolve(result)
          return
        } catch (error: any) {
          lastError = error

          // If it's a rate limit error, wait longer
          if (error?.message?.includes("429") || error?.code === 429) {
            const delayMs = Math.min(2000 * Math.pow(2, retries), 30000)
            console.warn(`Rate limit hit, retrying in ${delayMs}ms...`)
            await new Promise((r) => setTimeout(r, delayMs))
          } else if (retries < maxRetries) {
            // For other errors, use standard backoff
            const delayMs = Math.min(1000 * Math.pow(2, retries), 10000)
            await new Promise((r) => setTimeout(r, delayMs))
          }

          retries++
        }
      }

      reject(lastError || new Error("Max retries exceeded"))
    }

    // Add to queue and process
    requestQueue.push(executeRequest)
    processRequestQueue()
  })
}

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
  // First, try to use the public environment variable
  const publicRpcUrl = process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC

  if (publicRpcUrl && isValidRpcUrl(publicRpcUrl)) {
    console.log("Using NEXT_PUBLIC_MONAD_TESTNET_RPC:", publicRpcUrl)
    lastUsedRpcUrl = publicRpcUrl
    return publicRpcUrl
  }

  // If public env var is not available or invalid, use the default RPC URL
  // Note: We're using the direct URL instead of the proxy since the direct fetch works
  console.log("Public RPC URL not available, using default RPC URL:", DEFAULT_RPC_URL)
  lastUsedRpcUrl = DEFAULT_RPC_URL
  return DEFAULT_RPC_URL
}

// Get the RPC URL for display purposes only
function getDisplayRpcUrl(): string {
  const publicRpcUrl = process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC

  if (publicRpcUrl && isValidRpcUrl(publicRpcUrl)) {
    return publicRpcUrl
  }

  return DEFAULT_RPC_URL
}

// Get the last used RPC URL for debugging
export function getLastUsedRpcUrl(): string {
  return lastUsedRpcUrl || "No RPC URL used yet"
}

// Update the getClientProvider function to use a more resilient approach
export function getClientProvider() {
  if (!provider && !providerInitAttempted && typeof window !== "undefined") {
    providerInitAttempted = true
    try {
      const rpcUrl = getValidRpcUrl()
      console.log(`Initializing provider with RPC URL: ${rpcUrl}`)
      lastUsedRpcUrl = rpcUrl

      // Create provider with more options for stability
      provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
        staticNetwork: true,
        polling: true,
        pollingInterval: 8000, // Increased polling interval
        batchMaxCount: 1, // Disable batching for better control
        cacheTimeout: -1, // Disable provider's internal cache, we'll handle it
      })

      // Add event listeners for debugging
      if (provider) {
        provider.on("debug", (info) => {
          if (info.action === "response" && info.error) {
            console.warn(`Provider debug error (${rpcUrl}):`, info.error)
          }
        })

        provider.on("error", (error) => {
          console.error(`Provider error (${rpcUrl}):`, error)
        })
      }
    } catch (error) {
      console.error(`Failed to initialize provider with URL ${lastUsedRpcUrl}:`, error)
    }
  }
  return provider
}

// Reset provider to force re-initialization
export function resetClientProvider() {
  provider = null
  providerInitAttempted = false
  console.log("Provider reset, will be re-initialized on next use")
  return getClientProvider()
}

// Update the getClientNetwork function to use the queue system
export async function getClientNetwork() {
  try {
    console.log("Getting client network...")
    const provider = getClientProvider()
    if (!provider) {
      console.warn(`No provider available for getClientNetwork (last URL: ${lastUsedRpcUrl})`)
      return { name: "Monad Testnet", chainId: "1" }
    }

    return await queueRequest("network_info", async () => {
      const network = await provider.getNetwork()
      console.log("Network info received:", network)
      return {
        name: network.name || "Monad Testnet",
        chainId: network.chainId.toString(),
      }
    })
  } catch (error) {
    console.error(`Failed to get network (URL: ${lastUsedRpcUrl}):`, error)
    return { name: "Monad Testnet", chainId: "1" }
  }
}

// Update the getClientBlockNumber function to use the queue system
export async function getClientBlockNumber() {
  try {
    console.log("Getting client block number...")
    const provider = getClientProvider()
    if (!provider) {
      console.warn("No provider available for getClientBlockNumber")
      return "0"
    }

    return await queueRequest(
      "block_number",
      async () => {
        const blockNumber = await provider.getBlockNumber()
        console.log("Block number received:", blockNumber)
        return blockNumber.toString()
      },
      2,
    ) // Fewer retries for block number as it changes frequently
  } catch (error) {
    console.error("Failed to get block number:", error)
    return "0"
  }
}

// Update the getClientGasPrice function to use the queue system
export async function getClientGasPrice() {
  try {
    console.log("Getting client gas price...")
    const provider = getClientProvider()
    if (!provider) {
      console.warn("No provider available for getClientGasPrice")
      return { gasPrice: "0", gasPriceGwei: "1.0" }
    }

    return await queueRequest("gas_price", async () => {
      const gasPrice = await provider.getFeeData()
      console.log("Gas price received:", gasPrice)
      const gasPriceGwei = ethers.formatUnits(gasPrice.gasPrice || 0, "gwei")
      return {
        gasPrice: gasPrice.gasPrice?.toString() || "0",
        gasPriceGwei,
      }
    })
  } catch (error) {
    console.error("Failed to get gas price:", error)
    return { gasPrice: "0", gasPriceGwei: "1.0" }
  }
}

// Update the getClientAccountBalance function to use the queue system
export async function getClientAccountBalance(address: string) {
  try {
    console.log(`Getting balance for address: ${address}...`)
    const provider = getClientProvider()
    if (!provider) {
      console.warn("No provider available for getClientAccountBalance")
      return { wei: "0", ether: "0.0" }
    }

    return await queueRequest(`balance_${address}`, async () => {
      const balance = await provider.getBalance(address)
      console.log("Balance received:", balance.toString())
      return {
        wei: balance.toString(),
        ether: ethers.formatEther(balance),
      }
    })
  } catch (error) {
    console.error(`Failed to get balance for ${address}:`, error)
    return { wei: "0", ether: "0.0" }
  }
}

// Get client signer
export async function getClientSigner(): Promise<ethers.Signer | null> {
  try {
    const provider = getClientProvider()
    if (!provider) {
      console.warn("No provider available for getClientSigner")
      return null
    }

    const signer = await provider.getSigner()
    return signer
  } catch (error) {
    console.error("Failed to get client signer:", error)
    return null
  }
}
