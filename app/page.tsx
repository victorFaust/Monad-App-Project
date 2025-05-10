"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Check, ExternalLink, Info } from "lucide-react"
import Link from "next/link"

export default function Home() {
  const [apiStatus, setApiStatus] = useState<"loading" | "success" | "error">("loading")
  const [apiEndpoint, setApiEndpoint] = useState<string>("")
  const [rpcUrl, setRpcUrl] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [blockNumber, setBlockNumber] = useState<string>("Loading...")

  useEffect(() => {
    async function checkApiEndpoint() {
      try {
        const endpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || "Not configured"
        const rpc = process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC || "Not configured"

        setApiEndpoint(endpoint)
        setRpcUrl(rpc)

        // Try to fetch block number
        if (rpc !== "Not configured") {
          try {
            const response = await fetch(rpc, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_blockNumber",
                params: [],
                id: 1,
              }),
            })

            const data = await response.json()
            if (data && data.result) {
              const blockNum = Number.parseInt(data.result, 16)
              setBlockNumber(blockNum.toString())
            } else {
              setBlockNumber("Error fetching block number")
            }
          } catch (error) {
            console.error("Error fetching block number:", error)
            setBlockNumber("Error fetching block number")
          }
        }

        // Check API status
        if (endpoint !== "Not configured") {
          try {
            const response = await fetch(`${endpoint}/status`)

            if (response.ok) {
              setApiStatus("success")
            } else {
              setApiStatus("error")
              setErrorMessage("API endpoint is not responding correctly")
            }
          } catch (error) {
            setApiStatus("error")
            setErrorMessage(`Error connecting to API: ${error instanceof Error ? error.message : String(error)}`)
          }
        } else {
          setApiStatus("error")
          setErrorMessage("API endpoint is not configured")
        }
      } catch (error) {
        setApiStatus("error")
        setErrorMessage(`Error checking configuration: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    checkApiEndpoint()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">Monad MCP Interface</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Configuration Status</h2>

          <div className="space-y-4">
            <div className="flex items-start">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${apiStatus === "success" ? "bg-green-100 text-green-600" : apiStatus === "error" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}
              >
                {apiStatus === "success" ? <Check size={16} /> : <Info size={16} />}
              </div>
              <div>
                <h3 className="font-medium">API Endpoint</h3>
                <p className="text-gray-500 dark:text-gray-400 break-all">{apiEndpoint}</p>
                {apiStatus === "error" && <p className="text-red-500 mt-1 text-sm">{errorMessage}</p>}
              </div>
            </div>

            <div className="flex items-start">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${blockNumber !== "Loading..." && blockNumber !== "Error fetching block number" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}
              >
                {blockNumber !== "Loading..." && blockNumber !== "Error fetching block number" ? (
                  <Check size={16} />
                ) : (
                  <Info size={16} />
                )}
              </div>
              <div>
                <h3 className="font-medium">RPC URL</h3>
                <p className="text-gray-500 dark:text-gray-400 break-all">{rpcUrl}</p>
                <p className="text-sm mt-1">Current Block: {blockNumber}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Environment Variables</h2>
          <ul className="space-y-2">
            <li className="flex items-center">
              <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2">
                NEXT_PUBLIC_API_ENDPOINT
              </span>
              <span>{process.env.NEXT_PUBLIC_API_ENDPOINT || "Not set"}</span>
            </li>
            <li className="flex items-center">
              <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2">
                NEXT_PUBLIC_MONAD_TESTNET_RPC
              </span>
              <span>{process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC || "Not set"}</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <p className="mb-4">If all configurations are correct, you can proceed to the full application.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard <ArrowRight className="ml-2" size={16} />
          </Link>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            Having issues? Check the{" "}
            <a
              href="https://github.com/yourusername/monad-mcp-interface-minimal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline inline-flex items-center"
            >
              GitHub repository <ExternalLink className="ml-1" size={12} />
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
