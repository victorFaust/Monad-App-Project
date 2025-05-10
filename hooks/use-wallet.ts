"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import * as ethers from "ethers"
import type { WalletInfo } from "@/types/wallet"
import { useToast } from "@/hooks/use-toast"
import { getUserTokens, type TokenInfo } from "@/lib/token-service"
import { WalletErrorType, getWalletErrorType, getWalletErrorMessage } from "@/lib/wallet-errors"

// Balance refresh interval in milliseconds (default: 15 seconds)
const BALANCE_REFRESH_INTERVAL = 15000

// Connection timeout in milliseconds (default: 30 seconds)
const CONNECTION_TIMEOUT = 30000

export function useWallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [tokenBalances, setTokenBalances] = useState<TokenInfo[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [lastError, setLastError] = useState<{
    type: WalletErrorType
    message: string
    troubleshooting: string[]
  } | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Add error state to the hook
  const [walletError, setWalletError] = useState<{
    type: WalletErrorType
    message: string
    walletType?: string
    isUserRejection?: boolean
  } | null>(null)

  // Format balance to 3 decimal places
  const formatBalance = (balance: ethers.BigNumberish): string => {
    return Number(ethers.formatEther(balance)).toFixed(3)
  }

  // Function to refresh wallet balance
  const refreshBalance = useCallback(
    async (showToast = false) => {
      if (!wallet?.address || !wallet?.provider) return

      try {
        setIsRefreshing(true)
        const provider = wallet.provider
        const balance = await provider.getBalance(wallet.address)
        const formattedBalance = formatBalance(balance)

        // Only update if balance has changed
        if (formattedBalance !== wallet.balance) {
          setWallet((prev) => {
            if (!prev) return null
            return {
              ...prev,
              balance: formattedBalance,
            }
          })

          if (showToast) {
            toast({
              title: "Balance Updated",
              description: `Your MON balance is now ${formattedBalance}`,
            })
          }
        }
      } catch (error) {
        console.error("Failed to refresh wallet balance:", error)
        if (showToast) {
          toast({
            title: "Balance Update Failed",
            description: "Could not refresh your wallet balance",
            variant: "destructive",
          })
        }
      } finally {
        setIsRefreshing(false)
      }
    },
    [wallet, toast],
  )

  // Function to refresh token balances
  const refreshTokenBalances = useCallback(
    async (showToast = false) => {
      if (!wallet?.address) return

      try {
        setIsLoadingTokens(true)
        const tokens = await getUserTokens(wallet.address)

        // Check if token balances have changed
        const hasChanges =
          tokens.length !== tokenBalances.length ||
          tokens.some((token, index) => {
            const existingToken = tokenBalances[index]
            return (
              !existingToken ||
              existingToken.address !== token.address ||
              existingToken.formattedBalance !== token.formattedBalance
            )
          })

        if (hasChanges) {
          setTokenBalances(tokens)

          if (showToast && tokens.length > 0) {
            toast({
              title: "Token Balances Updated",
              description: `Updated balances for ${tokens.length} tokens`,
            })
          }
        }
      } catch (error) {
        console.error("Failed to refresh token balances:", error)
        if (showToast) {
          toast({
            title: "Token Update Failed",
            description: "Could not refresh your token balances",
            variant: "destructive",
          })
        }
      } finally {
        setIsLoadingTokens(false)
      }
    },
    [wallet, tokenBalances, toast],
  )

  // Combined function to refresh all balances
  const refreshAllBalances = useCallback(
    async (showToast = false) => {
      await refreshBalance(false)
      await refreshTokenBalances(false)

      if (showToast) {
        toast({
          title: "All Balances Updated",
          description: "Your wallet balances have been refreshed",
        })
      }
    },
    [refreshBalance, refreshTokenBalances, toast],
  )

  // Set up automatic balance refresh
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    // If wallet is connected, set up a new interval
    if (wallet?.address) {
      // Initial refresh
      refreshAllBalances(false)

      // Set up interval for subsequent refreshes
      refreshIntervalRef.current = setInterval(() => {
        refreshAllBalances(false)
      }, BALANCE_REFRESH_INTERVAL)
    }

    // Clean up on unmount or when wallet changes
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [wallet?.address, refreshAllBalances])

  // Check if wallet is already connected on page load
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()
            const address = await signer.getAddress()
            const balance = await provider.getBalance(address)

            setWallet({
              address,
              balance: formatBalance(balance),
              signer,
              provider,
              type: window.ethereum.isPhantom
                ? "phantom"
                : window.ethereum.isMetaMask
                  ? "metamask"
                  : window.ethereum.isCoinbaseWallet
                    ? "coinbase"
                    : window.ethereum.isTrust
                      ? "trustwallet"
                      : "unknown",
            })
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error)
        }
      }
    }

    checkConnection()
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          setWallet(null)
          setTokenBalances([])
        } else if (wallet && accounts[0] !== wallet.address) {
          // User switched accounts
          try {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()
            const address = await signer.getAddress()
            const balance = await provider.getBalance(address)

            setWallet({
              address,
              balance: formatBalance(balance),
              signer,
              provider,
              type: wallet.type,
            })

            // Reset token balances for new account
            setTokenBalances([])
          } catch (error) {
            console.error("Failed to update wallet after account change:", error)
          }
        }
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
      }
    }
  }, [wallet])

  // Helper function to check if a wallet is installed
  const isWalletInstalled = useCallback((walletType: string): boolean => {
    if (typeof window === "undefined") return false

    switch (walletType) {
      case "metamask":
        return !!window.ethereum?.isMetaMask
      case "coinbase":
        return !!window.ethereum?.isCoinbaseWallet
      case "phantom":
        return !!window.ethereum?.isPhantom
      case "trustwallet":
        return !!window.ethereum?.isTrust
      default:
        return false
    }
  }, [])

  // Helper function to detect multiple active wallet extensions
  const detectMultipleWallets = useCallback((): boolean => {
    if (typeof window === "undefined" || !window.ethereum) return false

    let walletCount = 0
    if (window.ethereum.isMetaMask) walletCount++
    if (window.ethereum.isCoinbaseWallet) walletCount++
    if (window.ethereum.isPhantom) walletCount++
    if (window.ethereum.isTrust) walletCount++

    return walletCount > 1
  }, [])

  // Helper function to check if an error is a user rejection
  const isUserRejectionError = (error: any): boolean => {
    // Check for common user rejection error patterns
    if (!error) return false

    // Check error code (4001 is standard for user rejection)
    if (error.code === 4001) return true

    // Check for specific error messages
    const errorMessage = error.message?.toLowerCase() || ""
    return (
      errorMessage.includes("user rejected") ||
      errorMessage.includes("user denied") ||
      errorMessage.includes("user cancelled") ||
      errorMessage.includes("user canceled")
    )
  }

  // Connect wallet with enhanced error handling
  const connectWallet = useCallback(
    async (walletType: string): Promise<boolean> => {
      // Reset any previous errors
      setWalletError(null)
      setIsConnecting(true)

      try {
        let provider: ethers.BrowserProvider

        // Add a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (isConnecting) {
            setIsConnecting(false)
            setWalletError({
              type: WalletErrorType.CONNECTION_TIMEOUT,
              message: "The wallet connection request timed out. Please try again.",
              walletType,
            })
          }
        }, CONNECTION_TIMEOUT)

        if (walletType === "metamask") {
          if (!window.ethereum?.isMetaMask) {
            setWalletError({
              type: WalletErrorType.NOT_INSTALLED,
              message: "MetaMask is not installed. Please install MetaMask extension to connect.",
              walletType,
            })
            setIsConnecting(false)
            return false
          }

          provider = new ethers.BrowserProvider(window.ethereum)
        } else if (walletType === "coinbase") {
          if (!window.ethereum?.isCoinbaseWallet) {
            setWalletError({
              type: WalletErrorType.NOT_INSTALLED,
              message: "Coinbase Wallet is not installed. Please install Coinbase Wallet extension to connect.",
              walletType,
            })
            setIsConnecting(false)
            return false
          }

          provider = new ethers.BrowserProvider(window.ethereum)
        } else if (walletType === "phantom") {
          if (!window.ethereum?.isPhantom) {
            setWalletError({
              type: WalletErrorType.NOT_INSTALLED,
              message: "Phantom Wallet is not installed. Please install Phantom Wallet extension to connect.",
              walletType,
            })
            setIsConnecting(false)
            return false
          }

          provider = new ethers.BrowserProvider(window.ethereum)
        } else if (walletType === "trustwallet") {
          if (!window.ethereum?.isTrust) {
            setWalletError({
              type: WalletErrorType.NOT_INSTALLED,
              message: "Trust Wallet is not installed. Please install Trust Wallet extension to connect.",
              walletType,
            })
            setIsConnecting(false)
            return false
          }

          provider = new ethers.BrowserProvider(window.ethereum)
        } else if (walletType === "walletconnect") {
          // In a real implementation, you would use WalletConnect's SDK
          setWalletError({
            type: WalletErrorType.NOT_INSTALLED,
            message: "WalletConnect integration requires additional setup.",
            walletType,
          })
          setIsConnecting(false)
          return false
        } else {
          setWalletError({
            type: WalletErrorType.UNKNOWN_ERROR,
            message: "The selected wallet type is not supported.",
            walletType,
          })
          setIsConnecting(false)
          return false
        }

        // Check for multiple wallet extensions
        if (
          (window.ethereum?.isMetaMask && window.ethereum?.isCoinbaseWallet) ||
          (window.ethereum?.isMetaMask && window.ethereum?.isPhantom) ||
          (window.ethereum?.isCoinbaseWallet && window.ethereum?.isPhantom)
        ) {
          console.warn("Multiple wallet extensions detected, this may cause issues")
        }

        // Request account access
        const accounts = await provider.send("eth_requestAccounts", [])

        if (accounts.length === 0) {
          throw new Error("No accounts found")
        }

        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        const balance = await provider.getBalance(address)

        setWallet({
          address,
          balance: formatBalance(balance),
          signer,
          provider,
          type: walletType, // Store the wallet type
        })

        // Clear the timeout when connection succeeds
        clearTimeout(connectionTimeout)

        toast({
          title: "Wallet Connected",
          description: `Your ${walletType} wallet has been connected successfully.`,
        })

        return true
      } catch (error: any) {
        console.error("Failed to connect wallet:", error)

        // Check if this is a user rejection error
        const isUserRejection = isUserRejectionError(error)

        // Determine error type and get user-friendly message
        const errorType = isUserRejection ? WalletErrorType.USER_REJECTED : getWalletErrorType(error)

        // Customize message for user rejection
        const errorMessage = isUserRejection
          ? "You declined the connection request. Please try again when you're ready to connect."
          : getWalletErrorMessage(error)

        // Set the wallet error state
        setWalletError({
          type: errorType,
          message: errorMessage,
          walletType,
          isUserRejection,
        })

        // Show toast for the error, but only if it's not a user rejection
        if (!isUserRejection) {
          toast({
            title: "Connection Failed",
            description: errorMessage,
            variant: "destructive",
          })
        }

        return false
      } finally {
        setIsConnecting(false)
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current)
          connectionTimeoutRef.current = null
        }
      }
    },
    [toast],
  )

  // Function to disconnect the wallet
  const disconnectWallet = useCallback(() => {
    setWallet(null)
    setTokenBalances([])
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    })
  }, [toast])

  // Add clearWalletError function
  const clearWalletError = useCallback(() => {
    setWalletError(null)
  }, [])

  // Update the return value to include the error state and clear function
  return {
    wallet,
    tokenBalances,
    connectWallet,
    disconnectWallet,
    isConnecting,
    isRefreshing,
    isLoadingTokens,
    walletError,
    clearWalletError,
    lastError,
    refreshBalance: () => refreshBalance(true), // Expose manual refresh with toast
    refreshTokenBalances: () => refreshTokenBalances(true), // Expose manual token refresh with toast
    refreshAllBalances: () => refreshAllBalances(true), // Expose manual refresh of all balances with toast
  }
}
