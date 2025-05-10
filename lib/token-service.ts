import { ethers } from "ethers"
import { getClientProvider } from "./client-blockchain"
import { getClientAccountBalance } from "./client-blockchain" // Import getClientAccountBalance

// Standard ERC-20 ABI for token interactions
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
  "event Approval(address indexed owner, address indexed spender, uint value)",
]

// Complete list of tokens on Monad network - these are real token addresses
export const TOKEN_LIST: { [key: string]: string } = {
  MON: "0x0000000000000000000000000000000000000000", // Native token
  WMON: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
  USDT: "0x88b8e2161dedc77ef4ab7585569d2415a1c1055d",
  USDC: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
  WETH: "0x836047a99e11f376522b447bffb6e3495dd0637c",
  WBTC: "0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d",
  DAI: "0x0f0bdebf0f83cd1ee3974779bcb7315f9808c714",
  WSOL: "0x5387C85A4965769f6B0Df430638a1388493486F1",
  MATIC: "0x8a86d48c867b76FF74A36d3AF4d2F1E707B143eD",
  AVAX: "0xD875Ba8e2caD3c0f7e2973277C360C8d2f92B510",
  LINK: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A",
  UNI: "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3",
  AAVE: "0x3a98250F98Dd388C211206983453837C8365BDc1",
  SHIB: "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c5",
  DOGE: "0x199c0Da6F291a897302300AAAe4F20d139162916",
}

// Token information with logos and metadata
export const KNOWN_TOKENS = [
  {
    address: TOKEN_LIST.MON,
    name: "Monad",
    symbol: "MON",
    decimals: 18,
    logoURI: "https://monad.xyz/favicon.ico",
    isNative: true,
  },
  {
    address: TOKEN_LIST.WMON,
    name: "Wrapped Monad",
    symbol: "WMON",
    decimals: 18,
    logoURI: "https://monad.xyz/favicon.ico",
  },
  {
    address: TOKEN_LIST.USDT,
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    logoURI: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  },
  {
    address: TOKEN_LIST.USDC,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logoURI: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  },
  {
    address: TOKEN_LIST.WETH,
    name: "Wrapped Ethereum",
    symbol: "WETH",
    decimals: 18,
    logoURI: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  {
    address: TOKEN_LIST.WBTC,
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    decimals: 8,
    logoURI: "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png",
  },
  {
    address: TOKEN_LIST.DAI,
    name: "Dai Stablecoin",
    symbol: "DAI",
    decimals: 18,
    logoURI: "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png",
  },
  {
    address: TOKEN_LIST.WSOL,
    name: "Wrapped Solana",
    symbol: "WSOL",
    decimals: 9,
    logoURI: "https://cryptologos.cc/logos/solana-sol-logo.png",
  },
  {
    address: TOKEN_LIST.MATIC,
    name: "Polygon",
    symbol: "MATIC",
    decimals: 18,
    logoURI: "https://cryptologos.cc/logos/polygon-matic-logo.png",
  },
  {
    address: TOKEN_LIST.AVAX,
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
    logoURI: "https://cryptologos.cc/logos/avalanche-avax-logo.png",
  },
  {
    address: TOKEN_LIST.LINK,
    name: "Chainlink",
    symbol: "LINK",
    decimals: 18,
    logoURI: "https://cryptologos.cc/logos/chainlink-link-logo.png",
  },
  {
    address: TOKEN_LIST.UNI,
    name: "Uniswap",
    symbol: "UNI",
    decimals: 18,
    logoURI: "https://cryptologos.cc/logos/uniswap-uni-logo.png",
  },
  {
    address: TOKEN_LIST.AAVE,
    name: "Aave",
    symbol: "AAVE",
    decimals: 18,
    logoURI: "https://cryptologos.cc/logos/aave-aave-logo.png",
  },
  {
    address: TOKEN_LIST.SHIB,
    name: "Shiba Inu",
    symbol: "SHIB",
    decimals: 18,
    logoURI: "https://cryptologos.cc/logos/shiba-inu-shib-logo.png",
  },
  {
    address: TOKEN_LIST.DOGE,
    name: "Dogecoin",
    symbol: "DOGE",
    decimals: 8,
    logoURI: "https://cryptologos.cc/logos/dogecoin-doge-logo.png",
  },
]

// Map to store token metadata for quick lookup
const TOKEN_METADATA: { [address: string]: { name: string; symbol: string; decimals: number; logoURI?: string } } = {}

// Initialize TOKEN_METADATA with KNOWN_TOKENS
KNOWN_TOKENS.forEach((token) => {
  TOKEN_METADATA[token.address.toLowerCase()] = {
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    logoURI: token.logoURI,
  }
})

// Add a token cache to reduce redundant RPC calls
const tokenInfoCache = new Map<string, any>()
const TOKEN_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export interface TokenInfo {
  address: string
  name: string
  symbol: string
  decimals: number
  balance?: string
  formattedBalance?: string
  logoURI?: string
  isNative?: boolean
}

export interface TokenBalanceInfo {
  address: string
  balance: string
  formattedBalance: string
}

// Update the getTokenInfo function to use caching
export async function getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
  // Check cache first
  const cacheKey = `token_info_${tokenAddress}`
  const cachedInfo = tokenInfoCache.get(cacheKey)

  if (cachedInfo && Date.now() - cachedInfo.timestamp < TOKEN_CACHE_DURATION) {
    return cachedInfo.data
  }

  // For known tokens, return hardcoded info to avoid RPC calls
  const knownToken = Object.values(TOKEN_LIST).find((token) => token.toLowerCase() === tokenAddress.toLowerCase())

  if (knownToken) {
    const tokenSymbol = Object.keys(TOKEN_LIST).find(
      (key) => TOKEN_LIST[key as keyof typeof TOKEN_LIST].toLowerCase() === tokenAddress.toLowerCase(),
    )

    let info: TokenInfo

    switch (tokenSymbol) {
      case "MON":
        info = {
          address: tokenAddress,
          name: "Monad",
          symbol: "MON",
          decimals: 18,
          logoURI: "/abstract-geometric-mon.png",
        }
        break
      case "USDC":
        info = {
          address: tokenAddress,
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          logoURI: "/digital-usdc-flow.png",
        }
        break
      case "USDT":
        info = {
          address: tokenAddress,
          name: "Tether USD",
          symbol: "USDT",
          decimals: 6,
          logoURI: "/tethered-currency.png",
        }
        break
      case "WETH":
        info = {
          address: tokenAddress,
          name: "Wrapped Ether",
          symbol: "WETH",
          decimals: 18,
          logoURI: "/Wrapped Ethereum Symbol.png",
        }
        break
      default:
        info = {
          address: tokenAddress,
          name: "Unknown Token",
          symbol: "UNKNOWN",
          decimals: 18,
          logoURI: "/digital-token-network.png",
        }
    }

    // Cache the result
    tokenInfoCache.set(cacheKey, {
      data: info,
      timestamp: Date.now(),
    })

    return info
  }

  // For unknown tokens, try to fetch from blockchain with fallbacks
  try {
    // Implement with retries and rate limiting
    let name = "Unknown Token"
    let symbol = "UNKNOWN"
    let decimals = 18

    try {
      const provider = getClientProvider()
      if (!provider) throw new Error("No provider available")

      // Create minimal ABI for token info
      const minABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
      ]

      const tokenContract = new ethers.Contract(tokenAddress, minABI, provider)

      // Use Promise.allSettled to get as much info as possible even if some calls fail
      const [nameResult, symbolResult, decimalsResult] = await Promise.allSettled([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
      ])

      if (nameResult.status === "fulfilled") name = nameResult.value
      if (symbolResult.status === "fulfilled") symbol = symbolResult.value
      if (decimalsResult.status === "fulfilled") decimals = decimalsResult.value
    } catch (error) {
      console.warn(`Failed to get complete token info for ${tokenAddress}:`, error)
      // Continue with defaults
    }

    const info: TokenInfo = {
      address: tokenAddress,
      name,
      symbol,
      decimals,
      logoURI: `/placeholder.svg?height=32&width=32&query=${symbol}`,
    }

    // Cache the result
    tokenInfoCache.set(cacheKey, {
      data: info,
      timestamp: Date.now(),
    })

    return info
  } catch (error) {
    console.error(`Failed to get token info for ${tokenAddress}:`, error)

    // Return a fallback
    const fallbackInfo: TokenInfo = {
      address: tokenAddress,
      name: "Unknown Token",
      symbol: "UNKNOWN",
      decimals: 18,
      logoURI: "/digital-token-network.png",
    }

    return fallbackInfo
  }
}

// Update the getTokenBalance function to use caching
export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<TokenBalanceInfo> {
  // For native token (MON), use account balance
  if (tokenAddress.toLowerCase() === TOKEN_LIST.MON.toLowerCase()) {
    try {
      const balance = await getClientAccountBalance(walletAddress)
      return {
        address: tokenAddress,
        balance: balance.wei,
        formattedBalance: balance.ether,
      }
    } catch (error) {
      console.error(`Failed to get MON balance for ${walletAddress}:`, error)
      return {
        address: tokenAddress,
        balance: "0",
        formattedBalance: "0",
      }
    }
  }

  // For other tokens, use token contract
  try {
    const cacheKey = `token_balance_${tokenAddress}_${walletAddress}`

    // Check if we have a recent cached balance
    const cachedBalance = tokenInfoCache.get(cacheKey)
    if (cachedBalance && Date.now() - cachedBalance.timestamp < 30000) {
      // 30 seconds cache for balances
      return cachedBalance.data
    }

    const provider = getClientProvider()
    if (!provider) throw new Error("No provider available")

    // Get token info (which is cached)
    const tokenInfo = await getTokenInfo(tokenAddress)

    // Minimal ABI for balanceOf
    const minABI = ["function balanceOf(address owner) view returns (uint256)"]

    const tokenContract = new ethers.Contract(tokenAddress, minABI, provider)

    // Add retry logic for balance calls
    let balance = "0"
    let retries = 0
    const maxRetries = 3

    while (retries <= maxRetries) {
      try {
        balance = (await tokenContract.balanceOf(walletAddress)).toString()
        break
      } catch (error: any) {
        if (error?.message?.includes("429") || error?.code === 429) {
          // Rate limit hit, wait and retry
          const delayMs = Math.min(2000 * Math.pow(2, retries), 10000)
          console.warn(`Rate limit hit when getting balance, retrying in ${delayMs}ms...`)
          await new Promise((r) => setTimeout(r, delayMs))
          retries++
        } else {
          throw error
        }
      }
    }

    // Format the balance based on decimals
    const formattedBalance = ethers.formatUnits(balance, tokenInfo.decimals)

    const result = {
      address: tokenAddress,
      balance,
      formattedBalance,
    }

    // Cache the result
    tokenInfoCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    })

    return result
  } catch (error) {
    console.error(`Failed to get token balance for ${tokenAddress}:`, error)
    return {
      address: tokenAddress,
      balance: "0",
      formattedBalance: "0",
    }
  }
}

export async function getUserTokens(walletAddress: string): Promise<TokenInfo[]> {
  try {
    if (!walletAddress) {
      return []
    }

    const provider = getClientProvider()
    if (!provider) {
      throw new Error("Provider not initialized")
    }

    // Get native token (MON) balance
    const monBalance = await provider.getBalance(walletAddress)
    const monFormattedBalance = ethers.formatEther(monBalance)

    const tokens: TokenInfo[] = [
      {
        ...KNOWN_TOKENS[0],
        balance: monBalance.toString(),
        formattedBalance: monFormattedBalance,
      },
    ]

    // Only add MON if balance is greater than zero
    const monTokens = Number.parseFloat(monFormattedBalance) > 0 ? tokens : []

    // Check balances for known tokens
    const tokenPromises = KNOWN_TOKENS.slice(1).map(async (token) => {
      try {
        const { balance, formattedBalance } = await getTokenBalance(token.address, walletAddress)

        // Only add tokens with non-zero balance
        if (balance !== "0") {
          return {
            ...token,
            balance,
            formattedBalance,
          }
        }
        return null
      } catch (error) {
        console.error(`Error fetching balance for token ${token.symbol}:`, error)
        return null
      }
    })

    const tokenResults = await Promise.all(tokenPromises)
    const nonZeroTokens = tokenResults.filter(Boolean) as TokenInfo[]

    return [...monTokens, ...nonZeroTokens]
  } catch (error) {
    console.error("Failed to get user tokens:", error)
    return []
  }
}

// Function to get all token balances for an address
export async function getAllTokenBalances(walletAddress: string): Promise<TokenInfo[]> {
  return getUserTokens(walletAddress)
}

// Function to get all available tokens
export function getAllTokens(): TokenInfo[] {
  return Object.entries(TOKEN_LIST).map(([symbol, address]) => {
    const knownToken = KNOWN_TOKENS.find((t) => t.address.toLowerCase() === address.toLowerCase())

    if (knownToken) {
      return knownToken
    }

    return {
      address,
      name: symbol,
      symbol,
      decimals: 18, // Default decimals
    }
  })
}

// Simple swap interface for token swapping
export interface SwapParams {
  fromToken: string
  toToken: string
  amount: string
  slippage: number
}

// Mock price data for tokens
const MOCK_PRICES: { [symbol: string]: number } = {
  MON: 1.0,
  WMON: 1.0,
  USDT: 1.0,
  USDC: 1.0,
  WETH: 1800.0,
  WBTC: 45000.0,
  DAI: 1.0,
  WSOL: 80.0,
  MATIC: 0.6,
  AVAX: 25.0,
  LINK: 15.0,
  UNI: 8.0,
  AAVE: 90.0,
  SHIB: 0.00002,
  DOGE: 0.1,
}

// Mock liquidity data for price impact simulation
const MOCK_LIQUIDITY: { [symbol: string]: number } = {
  MON: 1000000,
  WMON: 1000000,
  USDT: 5000000,
  USDC: 5000000,
  WETH: 10000,
  WBTC: 500,
  DAI: 5000000,
  WSOL: 50000,
  MATIC: 1000000,
  AVAX: 100000,
  LINK: 200000,
  UNI: 300000,
  AAVE: 30000,
  SHIB: 100000000000,
  DOGE: 50000000,
}

// Function to get token price from mock data
export async function getTokenPrice(tokenAddress: string): Promise<number> {
  try {
    // Find the token symbol for the given address
    const token = KNOWN_TOKENS.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase())

    if (!token) {
      console.warn(`No token info found for address ${tokenAddress}, using default price`)
      return 1.0 // Default price if token not found
    }

    // Use mock price data
    const mockPrice = MOCK_PRICES[token.symbol]
    if (mockPrice !== undefined) {
      return mockPrice
    }

    // If no mock price is available, return a default value
    return 1.0
  } catch (error) {
    console.error(`Failed to get price for token ${tokenAddress}:`, error)

    // Find the token symbol for the given address as a fallback
    const token = KNOWN_TOKENS.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase())
    if (token && MOCK_PRICES[token.symbol]) {
      return MOCK_PRICES[token.symbol]
    }

    // Default fallback price
    return 1.0
  }
}

// Calculate price impact based on trade size and liquidity
export function calculatePriceImpact(fromSymbol: string, toSymbol: string, fromAmount: number): number {
  const fromLiquidity = MOCK_LIQUIDITY[fromSymbol] || 1000000
  const toLiquidity = MOCK_LIQUIDITY[toSymbol] || 1000000

  // Calculate price impact as a percentage
  // The formula simulates how larger trades have higher price impact
  const impact = (fromAmount / fromLiquidity) * 100

  // Cap the impact at 20% and ensure it's at least 0.01% for any trade
  return Math.min(Math.max(impact, 0.01), 20)
}

// Enhanced swap simulation with price impact
export async function swapTokens(
  params: SwapParams,
  signer: ethers.Signer,
): Promise<{
  hash: string
  priceImpact: number
  outputAmount: string
}> {
  try {
    // Validate inputs
    if (!params.fromToken || !params.toToken) {
      throw new Error("Invalid token addresses")
    }

    if (!params.amount || params.amount === "0") {
      throw new Error("Invalid swap amount")
    }

    if (params.fromToken === params.toToken) {
      throw new Error("Cannot swap the same token")
    }

    // Get the signer's address
    const signerAddress = await signer.getAddress()

    // Get token information
    const fromTokenInfo = await getTokenInfo(params.fromToken)
    const toTokenInfo = await getTokenInfo(params.toToken)

    // Get token prices
    const fromPrice = await getTokenPrice(params.fromToken)
    const toPrice = await getTokenPrice(params.toToken)

    // Parse the input amount
    const fromAmount = Number(params.amount)

    // Calculate price impact
    const priceImpact = calculatePriceImpact(fromTokenInfo.symbol, toTokenInfo.symbol, fromAmount)

    // Calculate the expected output amount based on prices and price impact
    const rawOutputAmount = (fromAmount * fromPrice) / toPrice
    const impactFactor = 1 - priceImpact / 100
    const outputAmount = rawOutputAmount * impactFactor

    console.log("Swap simulation:", {
      from: fromTokenInfo.symbol,
      to: toTokenInfo.symbol,
      fromAmount,
      rawOutputAmount,
      outputAmount,
      priceImpact,
      fromPrice,
      toPrice,
    })

    // For native token (MON), we need to send a transaction to simulate the swap
    if (params.fromToken.toLowerCase() === TOKEN_LIST.MON.toLowerCase()) {
      // Send a small amount of MON to the user's own address to generate a transaction
      const tx = await signer.sendTransaction({
        to: signerAddress,
        value: ethers.parseEther("0.0001"), // Small amount to minimize gas costs
        data: "0x", // Empty data
      })

      // Wait for the transaction to be mined
      await tx.wait()

      return {
        hash: tx.hash,
        priceImpact,
        outputAmount: outputAmount.toFixed(6),
      }
    } else {
      // For ERC-20 tokens, we'll simulate a token approval transaction
      const tokenContract = new ethers.Contract(params.fromToken, ERC20_ABI, signer)

      // Approve a small amount to the user's own address (this won't actually transfer tokens)
      const tx = await tokenContract.approve(signerAddress, 1)

      // Wait for the transaction to be mined
      await tx.wait()

      return {
        hash: tx.hash,
        priceImpact,
        outputAmount: outputAmount.toFixed(6),
      }
    }
  } catch (error) {
    console.error("Failed to swap tokens:", error)
    throw error
  }
}

// Function to add a custom token to the list
export function addCustomToken(tokenInfo: TokenInfo): void {
  // Add to TOKEN_METADATA for future lookups
  TOKEN_METADATA[tokenInfo.address.toLowerCase()] = {
    name: tokenInfo.name,
    symbol: tokenInfo.symbol,
    decimals: tokenInfo.decimals,
    logoURI: tokenInfo.logoURI,
  }

  // Add to TOKEN_LIST
  TOKEN_LIST[tokenInfo.symbol] = tokenInfo.address

  // Add to KNOWN_TOKENS
  KNOWN_TOKENS.push(tokenInfo)

  // Add mock price and liquidity
  MOCK_PRICES[tokenInfo.symbol] = 1.0 // Default price
  MOCK_LIQUIDITY[tokenInfo.symbol] = 100000 // Default liquidity
}
