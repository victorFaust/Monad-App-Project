import { getCompletion } from "@/lib/api"
import type { WalletInfo } from "@/types/wallet"
import {
  getClientNetwork,
  getClientBlockNumber,
  getClientGasPrice,
  getClientAccountBalance,
} from "@/lib/client-blockchain"

interface CommandProcessorOptions {
  wallet: WalletInfo | null
  onSendTransaction: (to: string, value: string, data: string) => void
  onContractInteraction: (address: string) => void
  onOpenWalletModal: () => void
}

export async function processCommand(command: string, options: CommandProcessorOptions): Promise<string> {
  try {
    // First, try to parse the command locally if it's a simple one
    const simpleCommandResult = tryParseSimpleCommand(command, options)
    if (simpleCommandResult) {
      return simpleCommandResult
    }

    // Check for conversational inputs
    const conversationalResult = handleConversationalInput(command)
    if (conversationalResult) {
      return conversationalResult
    }

    // Try to handle the command directly without AI
    const fallbackResult = handleFallbackCommands(command, options)
    if (fallbackResult) {
      return fallbackResult
    }

    // If we can't handle it directly, try using AI (with a fallback if AI fails)
    try {
      // If not a simple command, try sending to NLP endpoint for parsing
      const response =
        await getCompletion(`Parse the following user command for a blockchain application and determine the action to take. Return ONLY a JSON object with action and parameters.
      Available actions: 
      - check_balance (params: address)
      - network_status (no params)
      - send_transaction (params: to, value, data optional)
      - gas_price (no params)
      - transaction_receipt (params: txHash)
      - contract_call (params: contractAddress, method, inputs)
      - help (no params)
      - conversation (params: message) - for general conversation
      
      User command: "${command}"
      
      JSON response:`)

      // Check if we got a successful response or a fallback response
      if (!response.success && !response.data) {
        throw new Error("Failed to parse command")
      }

      // Parse the action from the AI response
      let actionData
      try {
        // If we have a string response, parse it as JSON
        if (typeof response.data === "string") {
          actionData = JSON.parse(response.data)
        } else {
          // If we already have an object, use it directly
          actionData = response.data
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError)
        console.log("Raw response:", response.data)
        // If we can't parse the response, treat it as a conversational input
        return handleConversationalFallback(command)
      }

      // Execute the appropriate action
      return await executeAction(actionData, options)
    } catch (error) {
      console.warn("AI parsing failed, falling back to simple command parsing:", error)

      // If all else fails, treat it as a conversational input
      return handleConversationalFallback(command)
    }
  } catch (error) {
    console.error("Error processing command:", error)
    return 'I\'m having trouble processing your command right now. Please check your network connection and try again, or try a simpler command like "Show network status".'
  }
}

// Handle conversational inputs
function handleConversationalInput(command: string): string | null {
  const lowerCommand = command.toLowerCase().trim()

  // Greetings
  if (lowerCommand === "hi" || lowerCommand === "hello" || lowerCommand === "hey") {
    return "Hello! I'm your Monad blockchain assistant. How can I help you today? Try asking about network status, checking a balance, or type 'help' to see what I can do."
  }

  // Thanks/appreciation
  if (lowerCommand === "thanks" || lowerCommand === "thank you" || lowerCommand === "thx") {
    return "You're welcome! Is there anything else I can help you with?"
  }

  // How are you
  if (lowerCommand.includes("how are you")) {
    return "I'm functioning well, thank you for asking! I'm here to help you interact with the Monad blockchain. What would you like to do today?"
  }

  // What can you do
  if (lowerCommand.includes("what can you do") || lowerCommand.includes("what do you do")) {
    return showHelp()
  }

  return null
}

// Fallback for conversational inputs that don't match specific patterns
function handleConversationalFallback(command: string): string {
  return `I understand you're asking about "${command}". I can help with blockchain interactions on Monad. Here are some things you can ask me about:
  
  ${showHelp()}`
}

// Try to parse simple commands without using the AI API
function tryParseSimpleCommand(command: string, options: CommandProcessorOptions): string | null {
  const lowerCommand = command.toLowerCase().trim()

  if (lowerCommand === "help" || lowerCommand === "help me") {
    return showHelp()
  }

  if (
    lowerCommand === "show network status" ||
    lowerCommand === "network status" ||
    lowerCommand === "status" ||
    lowerCommand === "get status"
  ) {
    return showNetworkStatusDirectly()
  }

  if (
    lowerCommand === "gas price" ||
    lowerCommand === "show gas price" ||
    lowerCommand === "what is the gas price" ||
    lowerCommand === "get gas price"
  ) {
    return showGasPriceDirectly()
  }

  if (lowerCommand === "connect wallet" || lowerCommand === "connect my wallet") {
    options.onOpenWalletModal()
    return "Opening wallet connection dialog..."
  }

  if (
    lowerCommand.includes("cross-chain") ||
    lowerCommand.includes("bridge") ||
    lowerCommand.includes("transfer to other chain")
  ) {
    return "To perform cross-chain transfers, please use the Cross-Chain Transfer panel below. This allows you to send MON from Monad to other supported blockchains."
  }

  return null
}

// Handle fallback commands when AI parsing fails
function handleFallbackCommands(command: string, options: CommandProcessorOptions): string | null {
  const lowerCommand = command.toLowerCase().trim()

  // Check for balance command pattern
  if (lowerCommand.includes("balance") && lowerCommand.includes("0x")) {
    const addressMatch = command.match(/0x[a-fA-F0-9]{40}/)
    if (addressMatch) {
      return checkBalanceDirectly(addressMatch[0])
    }
  }

  // Check for send transaction pattern
  if ((lowerCommand.includes("send") || lowerCommand.includes("transfer")) && lowerCommand.includes("0x")) {
    const addressMatch = command.match(/0x[a-fA-F0-9]{40}/)
    const valueMatch = command.match(/(\d+\.?\d*)\s*(mon|monad)/i)

    if (addressMatch && valueMatch) {
      options.onSendTransaction(addressMatch[0], valueMatch[1], "")
      return "Opening transaction form..."
    }
  }

  // Check for contract interaction pattern
  if (lowerCommand.includes("contract") && lowerCommand.includes("0x")) {
    const addressMatch = command.match(/0x[a-fA-F0-9]{40}/)
    if (addressMatch) {
      options.onContractInteraction(addressMatch[0])
      return "Opening contract interaction form..."
    }
  }

  // Additional patterns for common queries
  if (lowerCommand.includes("block") && (lowerCommand.includes("number") || lowerCommand.includes("height"))) {
    return showBlockNumberDirectly()
  }

  if (lowerCommand.includes("my wallet") || lowerCommand.includes("wallet info")) {
    return showWalletInfo(options.wallet)
  }

  if (lowerCommand.includes("token") && lowerCommand.includes("list")) {
    return "Please check the Token Balances panel below to see all your tokens on Monad."
  }

  return null
}

async function executeAction(actionData: any, options: CommandProcessorOptions): Promise<string> {
  const { action, params } = actionData

  switch (action) {
    case "check_balance":
      return await checkBalance(params.address)
    case "network_status":
      return await showNetworkStatus()
    case "send_transaction":
      options.onSendTransaction(params.to || "", params.value || "", params.data || "")
      return "Opening transaction form..."
    case "gas_price":
      return await showGasPrice()
    case "transaction_receipt":
      return await checkTransactionReceipt(params.txHash)
    case "contract_call":
      options.onContractInteraction(params.contractAddress || "")
      return "Opening contract interaction form..."
    case "help":
      return showHelp()
    case "conversation":
      return handleConversationalFallback(params.message || "")
    default:
      return "I'm not sure how to handle that request. Try asking for help to see what I can do."
  }
}

async function checkBalance(address: string): Promise<string> {
  try {
    // Try API route first
    try {
      const response = await fetchWithTimeout(`/api/balance/${address}`, { timeout: 5000 })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          return `
            <div>
              <p><strong>Address:</strong> ${address}</p>
              <p><strong>Balance:</strong> ${data.data.balance} MON</p>
              ${data.data.error ? `<p class="text-amber-600 dark:text-amber-400"><strong>Note:</strong> Using estimated value due to: ${data.data.error}</p>` : ""}
            </div>
          `
        }
      }
      throw new Error("API route not available")
    } catch (error) {
      console.warn("Balance API not available, using direct blockchain connection")

      // Use client-side blockchain service as fallback
      const balance = await getClientAccountBalance(address)
      return `
        <div>
          <p><strong>Address:</strong> ${address}</p>
          <p><strong>Balance:</strong> ${balance.ether} MON</p>
        </div>
      `
    }
  } catch (error: any) {
    return `Error checking balance: ${error.message}`
  }
}

// Direct balance check without using API
async function checkBalanceDirectly(address: string): Promise<string> {
  try {
    const balance = await getClientAccountBalance(address)
    return `
      <div>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Balance:</strong> ${balance.ether} MON</p>
      </div>
    `
  } catch (error: any) {
    return `Error checking balance: ${error.message}`
  }
}

async function showNetworkStatus(): Promise<string> {
  try {
    // Try API route first
    try {
      const response = await fetchWithTimeout("/api/status", { timeout: 5000 })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Check if there was an error in the blockchain service
          if (data.data.error) {
            console.warn("API returned success but had blockchain error:", data.data.error)
          }

          return `
            <div class="space-y-2">
              <p><strong>Network:</strong> ${data.data.networkName}</p>
              <p><strong>Chain ID:</strong> ${data.data.chainId}</p>
              <p><strong>Current Block:</strong> ${data.data.blockNumber}</p>
              <p><strong>RPC Endpoint:</strong> ${data.data.rpcEndpoint}</p>
              ${data.data.error ? `<p class="text-amber-600 dark:text-amber-400"><strong>Note:</strong> Using cached data due to: ${data.data.error}</p>` : ""}
            </div>
          `
        }
      }
      throw new Error("API route not available")
    } catch (error) {
      return await showNetworkStatusDirectly()
    }
  } catch (error: any) {
    return `Error fetching network status: ${error.message}`
  }
}

// Update the showNetworkStatusDirectly function to use the public environment variable
async function showNetworkStatusDirectly(): Promise<string> {
  try {
    const network = await getClientNetwork()
    const blockNumber = await getClientBlockNumber()

    // Get a valid RPC URL for display
    let rpcEndpoint = "https://testnet-rpc.monad.xyz"
    if (typeof window !== "undefined") {
      const envRpcUrl = process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC
      if (envRpcUrl && envRpcUrl.startsWith("http")) {
        rpcEndpoint = envRpcUrl
      }
    }

    return `
      <div class="space-y-2">
        <p><strong>Network:</strong> ${network.name}</p>
        <p><strong>Chain ID:</strong> ${network.chainId}</p>
        <p><strong>Current Block:</strong> ${blockNumber}</p>
        <p><strong>RPC Endpoint:</strong> ${rpcEndpoint}</p>
      </div>
    `
  } catch (error: any) {
    return `Error fetching network status: ${error.message}`
  }
}

async function showGasPrice(): Promise<string> {
  try {
    // Try API route first
    try {
      const response = await fetchWithTimeout("/api/gasprice", { timeout: 5000 })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          return `
            <div>
              <p><strong>Current gas price:</strong> ${data.data.gasPriceGwei} Gwei</p>
              ${data.data.error ? `<p class="text-amber-600 dark:text-amber-400"><strong>Note:</strong> Using estimated value due to: ${data.data.error}</p>` : ""}
            </div>
          `
        }
      }
      throw new Error("API route not available")
    } catch (error) {
      return await showGasPriceDirectly()
    }
  } catch (error: any) {
    return `Error fetching gas price: ${error.message}`
  }
}

// Direct gas price check without using API
async function showGasPriceDirectly(): Promise<string> {
  try {
    const gasPrice = await getClientGasPrice()

    return `
      <div>
        <p><strong>Current gas price:</strong> ${gasPrice.gasPriceGwei} Gwei</p>
      </div>
    `
  } catch (error: any) {
    return `Error fetching gas price: ${error.message}`
  }
}

// Show current block number directly
async function showBlockNumberDirectly(): Promise<string> {
  try {
    const blockNumber = await getClientBlockNumber()
    return `
      <div>
        <p><strong>Current Block Number:</strong> ${blockNumber}</p>
      </div>
    `
  } catch (error: any) {
    return `Error fetching block number: ${error.message}`
  }
}

// Show wallet info
function showWalletInfo(wallet: WalletInfo | null): string {
  if (!wallet) {
    return "No wallet is connected. Please connect your wallet first."
  }

  return `
    <div class="space-y-2">
      <p><strong>Connected Wallet:</strong> ${wallet.address}</p>
      <p><strong>Wallet Type:</strong> ${wallet.type}</p>
      <p><strong>Balance:</strong> ${wallet.balance || "Loading..."} MON</p>
    </div>
  `
}

async function checkTransactionReceipt(txHash: string): Promise<string> {
  try {
    const response = await fetchWithTimeout(`/api/receipt/${txHash}`, { timeout: 5000 })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        const receipt = data.data
        return `
          <div>
            <p><strong>Transaction:</strong> ${txHash}</p>
            <p><strong>Status:</strong> ${receipt.status ? "Success" : "Failed"}</p>
            <p><strong>Block Number:</strong> ${receipt.blockNumber}</p>
            <p><strong>Gas Used:</strong> ${receipt.gasUsed.toString()}</p>
          </div>
        `
      }
    }
    return `Error checking transaction: Transaction not found or pending`
  } catch (error: any) {
    return `Error checking transaction: ${error.message}`
  }
}

function showHelp(): string {
  return `
    <div>
      <p><strong>Here are some commands you can try:</strong></p>
      <ul class="list-disc pl-5 mt-2">
        <li>"Show network status" - Display information about the Monad network</li>
        <li>"Check balance of 0x..." - Check the balance of an address</li>
        <li>"What's the current gas price?" - Show the current gas price</li>
        <li>"Send 0.1 MON to 0x..." - Create a transaction</li>
        <li>"Check transaction 0x..." - Look up a transaction receipt</li>
        <li>"Connect my wallet" - Connect a wallet for transactions</li>
        <li>"Interact with contract at 0x..." - Open contract interaction</li>
        <li>"What's the current block number?" - Show the latest block</li>
        <li>"Show my wallet info" - Display information about your connected wallet</li>
        <li>"Show my tokens" - View all your token balances on Monad</li>
        <li>"Cross-chain transfer" - Transfer MON to other blockchains</li>
      </ul>
    </div>
  `
}

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
