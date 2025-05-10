// API endpoint (adjust this to your MCP server location)
const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "https://v0-break-down-ts-ixfmlfv4o-victorfausts-projects.vercel.app/api"

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(resource: string, options: any = {}): Promise<Response> {
  const { timeout = 8000 } = options

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    })

    clearTimeout(id)

    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

// Network Status
export async function getNetworkStatus() {
  try {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/status`, { timeout: 5000 })
    return await response.json()
  } catch (error) {
    console.error("Failed to get network status:", error)
    return { success: false, error: "Failed to fetch network status" }
  }
}

// Gas Price
export async function getGasPrice() {
  try {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/gasprice`, { timeout: 5000 })
    return await response.json()
  } catch (error) {
    console.error("Failed to get gas price:", error)
    return { success: false, error: "Failed to fetch gas price" }
  }
}

// Balance
export async function getBalance(address: string) {
  try {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/balance/${address}`, { timeout: 5000 })
    return await response.json()
  } catch (error) {
    console.error(`Failed to get balance for ${address}:`, error)
    return { success: false, error: "Failed to fetch balance" }
  }
}

// Transaction Count
export async function getTransactionCount(address: string) {
  try {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/nonce/${address}`, { timeout: 5000 })
    return await response.json()
  } catch (error) {
    console.error(`Failed to get transaction count for ${address}:`, error)
    return { success: false, error: "Failed to fetch transaction count" }
  }
}

// Send Transaction
export async function sendTransaction(to: string, value: string, data = "0x") {
  try {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, value, data }),
      timeout: 10000, // Longer timeout for transactions
    })
    return await response.json()
  } catch (error) {
    console.error("Failed to send transaction:", error)
    return { success: false, error: "Failed to send transaction" }
  }
}

// Transaction Receipt
export async function getTransactionReceipt(txHash: string) {
  try {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/receipt/${txHash}`, { timeout: 5000 })
    return await response.json()
  } catch (error) {
    console.error(`Failed to get receipt for ${txHash}:`, error)
    return { success: false, error: "Failed to fetch transaction receipt" }
  }
}

// Call Contract
export async function callContract(contractAddress: string, abi: string, method: string, params: any[] = []) {
  try {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/contract/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractAddress,
        abi: JSON.parse(abi),
        method,
        params,
      }),
      timeout: 10000, // Longer timeout for contract calls
    })
    return await response.json()
  } catch (error) {
    console.error(`Failed to call contract method ${method}:`, error)
    return { success: false, error: "Failed to call contract method" }
  }
}

// Deploy Contract
export async function deployContract(abi: string, bytecode: string, constructorArgs: any[] = []) {
  try {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/contract/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        abi: JSON.parse(abi),
        bytecode,
        constructorArgs,
      }),
      timeout: 30000, // Longer timeout for contract deployment
    })
    return await response.json()
  } catch (error) {
    console.error("Failed to deploy contract:", error)
    return { success: false, error: "Failed to deploy contract" }
  }
}

// OpenAI Completion with improved error handling and fallback
export async function getCompletion(prompt: string) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key is not configured. Using local fallback processing.")
      return {
        success: false,
        error: "OpenAI API key is not configured",
        data: generateFallbackResponse(prompt), // Provide a fallback response
      }
    }

    // Try to use the OpenAI API
    try {
      const response = await fetchWithTimeout(`${API_ENDPOINT}/openai/completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          temperature: 0.3,
        }),
        timeout: 15000, // Longer timeout for AI completions
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      console.warn("OpenAI API request failed, using fallback:", error)
      return {
        success: true,
        data: generateFallbackResponse(prompt),
      }
    }
  } catch (error: any) {
    console.error("Failed to get AI completion:", error)
    return {
      success: false,
      error: error.message || "Failed to get AI completion",
      data: generateFallbackResponse(prompt), // Always provide a fallback
    }
  }
}

// Generate a fallback response when OpenAI API is unavailable
function generateFallbackResponse(prompt: string): string {
  // Simple keyword-based response system
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes("balance") && lowerPrompt.includes("0x")) {
    return JSON.stringify({
      action: "check_balance",
      params: {
        address: extractAddress(prompt),
      },
    })
  }

  if (lowerPrompt.includes("network") && lowerPrompt.includes("status")) {
    return JSON.stringify({
      action: "network_status",
      params: {},
    })
  }

  if (lowerPrompt.includes("gas") && lowerPrompt.includes("price")) {
    return JSON.stringify({
      action: "gas_price",
      params: {},
    })
  }

  if ((lowerPrompt.includes("send") || lowerPrompt.includes("transfer")) && lowerPrompt.includes("0x")) {
    return JSON.stringify({
      action: "send_transaction",
      params: {
        to: extractAddress(prompt),
        value: extractAmount(prompt),
      },
    })
  }

  if (lowerPrompt.includes("help")) {
    return JSON.stringify({
      action: "help",
      params: {},
    })
  }

  // Default fallback for conversation
  return JSON.stringify({
    action: "conversation",
    params: {
      message: prompt,
    },
  })
}

// Helper function to extract Ethereum address from text
function extractAddress(text: string): string {
  const addressMatch = text.match(/0x[a-fA-F0-9]{40}/)
  return addressMatch ? addressMatch[0] : ""
}

// Helper function to extract amount from text
function extractAmount(text: string): string {
  const amountMatch = text.match(/(\d+\.?\d*)\s*(mon|monad|eth|ether)/i)
  return amountMatch ? amountMatch[1] : "0.1" // Default to 0.1 if no amount found
}
