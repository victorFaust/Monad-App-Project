"use client"

import { useState, useCallback } from "react"
import type { NetworkStatusInfo } from "@/types/network"

// Add imports for client-side blockchain service
import { getClientNetwork, getClientBlockNumber, getClientGasPrice } from "@/lib/client-blockchain"

// Helper function to validate RPC URL
function isValidRpcUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === "http:" || urlObj.protocol === "https:"
  } catch (e) {
    return false
  }
}

// Get a valid RPC URL for display
function getDisplayRpcUrl(): string {
  const defaultUrl = "https://testnet-rpc.monad.xyz"
  const envUrl = process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC
  return isValidRpcUrl(envUrl) ? envUrl! : defaultUrl
}

export function useNetwork() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusInfo>({})

  // Update the refreshNetworkStatus function to use client-side blockchain service as fallback
  const refreshNetworkStatus = useCallback(async () => {
    try {
      // Set a timeout for the fetch requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      // Try API route first
      try {
        const statusResponse = await fetch("/api/status", {
          signal: controller.signal,
        })

        if (statusResponse.ok) {
          const data = await statusResponse.json()
          if (data.success) {
            setNetworkStatus((prev) => ({
              ...prev,
              networkName: data.data.networkName,
              chainId: data.data.chainId.toString(),
              blockNumber: data.data.blockNumber.toString(),
              rpcEndpoint: isValidRpcUrl(data.data.rpcEndpoint) ? data.data.rpcEndpoint : getDisplayRpcUrl(),
            }))
          }
        } else {
          throw new Error("API route not available")
        }
      } catch (error) {
        console.warn("Network status API not available, using direct blockchain connection")

        // Use client-side blockchain service as fallback
        try {
          const network = await getClientNetwork()
          const blockNumber = await getClientBlockNumber()

          setNetworkStatus((prev) => ({
            ...prev,
            networkName: network.name,
            chainId: network.chainId,
            blockNumber: blockNumber,
            rpcEndpoint: getDisplayRpcUrl(),
          }))
        } catch (fallbackError) {
          console.error("Fallback blockchain connection failed:", fallbackError)
          setNetworkStatus((prev) => ({
            ...prev,
            networkName: "Monad Testnet",
            chainId: "1",
            blockNumber: "Not Available",
            rpcEndpoint: getDisplayRpcUrl(),
          }))
        }
      }

      // Try API route for gas price
      try {
        const gasPriceResponse = await fetch("/api/gasprice", {
          signal: controller.signal,
        })

        if (gasPriceResponse.ok) {
          const data = await gasPriceResponse.json()
          if (data.success) {
            setNetworkStatus((prev) => ({
              ...prev,
              gasPriceGwei: data.data.gasPriceGwei,
            }))
          }
        } else {
          throw new Error("Gas price API not available")
        }
      } catch (error) {
        console.warn("Gas price API not available, using direct blockchain connection")

        // Use client-side blockchain service as fallback
        try {
          const gasPrice = await getClientGasPrice()
          setNetworkStatus((prev) => ({
            ...prev,
            gasPriceGwei: gasPrice.gasPriceGwei,
          }))
        } catch (fallbackError) {
          console.error("Fallback gas price fetch failed:", fallbackError)
          setNetworkStatus((prev) => ({
            ...prev,
            gasPriceGwei: "1.0",
          }))
        }
      }

      clearTimeout(timeoutId)
    } catch (error) {
      console.error("Failed to refresh network status:", error)
      // Ensure we have fallback values even if everything fails
      setNetworkStatus({
        networkName: "Monad Testnet",
        chainId: "1",
        blockNumber: "Not Available",
        gasPriceGwei: "1.0",
        rpcEndpoint: getDisplayRpcUrl(),
      })
    }
  }, [])

  return {
    networkStatus,
    refreshNetworkStatus,
  }
}
