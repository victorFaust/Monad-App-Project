// Debug utilities for troubleshooting token swaps and other functionality

/**
 * Logs detailed information about a token swap for debugging purposes
 */
export function debugSwap(params: {
  fromToken: string
  fromSymbol: string
  toToken: string
  toSymbol: string
  fromAmount: string
  toAmount: string
  exchangeRate?: number
  slippage?: number
  walletAddress?: string
}): void {
  console.group("Token Swap Debug Info")
  console.log("From Token:", params.fromToken, `(${params.fromSymbol})`)
  console.log("To Token:", params.toToken, `(${params.toSymbol})`)
  console.log("From Amount:", params.fromAmount)
  console.log("To Amount:", params.toAmount)

  if (params.exchangeRate !== undefined) {
    console.log("Exchange Rate:", params.exchangeRate)
  }

  if (params.slippage !== undefined) {
    console.log("Slippage Tolerance:", `${params.slippage}%`)
  }

  if (params.walletAddress) {
    console.log("Wallet Address:", params.walletAddress)
  }

  console.log("Timestamp:", new Date().toISOString())
  console.groupEnd()
}

/**
 * Logs wallet balance information for debugging purposes
 */
export function debugWalletBalances(params: {
  address: string
  nativeBalance?: string
  tokens?: Array<{ symbol: string; balance: string }>
}): void {
  console.group("Wallet Balance Debug Info")
  console.log("Wallet Address:", params.address)

  if (params.nativeBalance) {
    console.log("Native Balance (MON):", params.nativeBalance)
  }

  if (params.tokens && params.tokens.length > 0) {
    console.log("Token Balances:")
    params.tokens.forEach((token) => {
      console.log(`- ${token.symbol}: ${token.balance}`)
    })
  }

  console.log("Timestamp:", new Date().toISOString())
  console.groupEnd()
}

/**
 * Logs transaction information for debugging purposes
 */
export function debugTransaction(params: {
  hash: string
  from: string
  to: string
  value?: string
  data?: string
  status?: string
}): void {
  console.group("Transaction Debug Info")
  console.log("Transaction Hash:", params.hash)
  console.log("From:", params.from)
  console.log("To:", params.to)

  if (params.value) {
    console.log("Value:", params.value)
  }

  if (params.data) {
    console.log("Data:", params.data)
  }

  if (params.status) {
    console.log("Status:", params.status)
  }

  console.log("Timestamp:", new Date().toISOString())
  console.groupEnd()
}
