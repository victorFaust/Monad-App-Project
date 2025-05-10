"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="mb-6">
          This is a placeholder for the full Monad MCP Interface dashboard. The configuration is working correctly if
          you can see this page.
        </p>

        <div className="flex justify-between">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft className="mr-2" size={16} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
