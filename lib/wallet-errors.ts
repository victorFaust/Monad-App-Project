// Define error types for wallet connections
export enum WalletErrorType {
  // Installation errors
  NOT_INSTALLED = "NOT_INSTALLED",
  MULTIPLE_WALLETS = "MULTIPLE_WALLETS",

  // User interaction errors
  USER_REJECTED = "USER_REJECTED",
  ALREADY_PROCESSING = "ALREADY_PROCESSING",

  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  WRONG_NETWORK = "WRONG_NETWORK",
  RPC_ERROR = "RPC_ERROR",

  // Timeout errors
  CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",

  // Permission errors
  UNAUTHORIZED = "UNAUTHORIZED",

  // Unknown/other errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// Error messages mapped to error types
export const WALLET_ERROR_MESSAGES: Record<WalletErrorType, string> = {
  [WalletErrorType.NOT_INSTALLED]:
    "Wallet extension is not installed. Please install the wallet extension and try again.",
  [WalletErrorType.MULTIPLE_WALLETS]:
    "Multiple wallet extensions detected. Please disable all but one wallet extension and try again.",
  [WalletErrorType.USER_REJECTED]:
    "Connection request was rejected. Please approve the connection request in your wallet.",
  [WalletErrorType.ALREADY_PROCESSING]: "A wallet connection is already in progress. Please wait for it to complete.",
  [WalletErrorType.NETWORK_ERROR]: "Network connection error. Please check your internet connection and try again.",
  [WalletErrorType.WRONG_NETWORK]: "Your wallet is connected to the wrong network. Please switch to Monad Testnet.",
  [WalletErrorType.RPC_ERROR]: "RPC connection error. The blockchain node may be down or unreachable.",
  [WalletErrorType.CONNECTION_TIMEOUT]:
    "Connection request timed out. Please check if your wallet is responding and try again.",
  [WalletErrorType.UNAUTHORIZED]: "Wallet access unauthorized. Please check your wallet permissions.",
  [WalletErrorType.UNKNOWN_ERROR]: "An unknown error occurred while connecting to your wallet. Please try again.",
}

// Helper function to determine error type from error object
export function getWalletErrorType(error: any): WalletErrorType {
  // Check for user rejection (most common error)
  if (error.code === 4001 || error.message?.includes("User rejected") || error.message?.includes("user rejected")) {
    return WalletErrorType.USER_REJECTED
  }

  // Check for wallet not installed
  if (error.message?.includes("not installed") || error.message?.includes("Provider not found")) {
    return WalletErrorType.NOT_INSTALLED
  }

  // Check for timeout
  if (error.message?.includes("timeout") || error.code === "TIMEOUT") {
    return WalletErrorType.CONNECTION_TIMEOUT
  }

  // Check for network errors
  if (error.message?.includes("network") || error.message?.includes("Network") || error.code === "NETWORK_ERROR") {
    return WalletErrorType.NETWORK_ERROR
  }

  // Check for RPC errors
  if (error.message?.includes("RPC") || error.message?.includes("rpc error")) {
    return WalletErrorType.RPC_ERROR
  }

  // Check for wrong network
  if (error.message?.includes("chain ID") || error.message?.includes("network") || error.code === "CHAIN_MISMATCH") {
    return WalletErrorType.WRONG_NETWORK
  }

  // Default to unknown error
  return WalletErrorType.UNKNOWN_ERROR
}

// Get a user-friendly error message with guidance
export function getWalletErrorMessage(error: any): string {
  const errorType = getWalletErrorType(error)
  return WALLET_ERROR_MESSAGES[errorType]
}

// Get troubleshooting steps based on error type
export function getWalletErrorTroubleshooting(errorType: WalletErrorType): string[] {
  switch (errorType) {
    case WalletErrorType.NOT_INSTALLED:
      return [
        "Install the wallet extension from the official website",
        "Refresh the page after installation",
        "Make sure the extension is enabled in your browser",
      ]

    case WalletErrorType.USER_REJECTED:
      return [
        "Check your wallet for pending connection requests",
        "Try connecting again and approve the request",
        "If using a hardware wallet, check the device screen for prompts",
      ]

    case WalletErrorType.CONNECTION_TIMEOUT:
      return [
        "Check if your wallet extension is responsive",
        "Restart your browser and try again",
        "Disable other wallet extensions that might interfere",
        "Check your internet connection",
      ]

    case WalletErrorType.NETWORK_ERROR:
      return [
        "Check your internet connection",
        "Try using a different network connection",
        "The blockchain node might be experiencing issues, try again later",
      ]

    case WalletErrorType.WRONG_NETWORK:
      return [
        "Open your wallet and switch to Monad Testnet",
        "If Monad Testnet is not available, add it manually",
        "Check if your wallet supports Monad Testnet",
      ]

    case WalletErrorType.MULTIPLE_WALLETS:
      return [
        "Disable all wallet extensions except the one you want to use",
        "Restart your browser after disabling extensions",
        "Try using incognito/private browsing mode with only one extension enabled",
      ]

    default:
      return [
        "Refresh the page and try again",
        "Restart your browser",
        "Check if your wallet is up to date",
        "Try using a different browser",
      ]
  }
}
