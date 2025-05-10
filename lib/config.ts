// Configuration for the application
const config = {
  // API endpoint for backend services
  apiEndpoint:
    process.env.NEXT_PUBLIC_API_ENDPOINT || "https://v0-break-down-ts-ixfmlfv4o-victorfausts-projects.vercel.app/api",

  // Monad Testnet RPC URL
  rpcUrl: process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz",

  // Default port for local development
  port: process.env.PORT || 3000,

  // Check if we're in development mode
  isDevelopment: process.env.NODE_ENV === "development",

  // Check if we have OpenAI API key
  hasOpenAI: !!process.env.OPENAI_API_KEY,
}

export default config
