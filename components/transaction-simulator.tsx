"use client"

import { useState } from "react"
import { AlertCircle, ArrowRight, CheckCircle, FileCode, CreditCard, Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ethers } from "ethers"
import { getClientProvider } from "@/lib/client-blockchain"
import type { WalletInfo } from "@/types/wallet"

interface TransactionSimulatorProps {
  wallet: WalletInfo | null
  onSendTransaction: (to: string, value: string, data: string) => void
}

export function TransactionSimulator({ wallet, onSendTransaction }: TransactionSimulatorProps) {
  const [to, setTo] = useState("")
  const [value, setValue] = useState("")
  const [data, setData] = useState("")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<{
    success: boolean
    gasEstimate?: string
    error?: string
    balanceAfter?: string
  } | null>(null)

  const simulateTransaction = async () => {
    if (!wallet || !to || !to.startsWith("0x")) {
      return
    }

    setIsSimulating(true)
    setSimulationResult(null)

    try {
      const provider = getClientProvider()
      if (!provider) {
        throw new Error("Provider not initialized")
      }

      // Get current balance
      const currentBalance = await provider.getBalance(wallet.address)

      // Parse value to wei
      const valueInWei = value ? ethers.parseEther(value) : ethers.parseEther("0")

      // Estimate gas
      const gasEstimate = await provider.estimateGas({
        from: wallet.address,
        to,
        value: valueInWei,
        data: data || "0x",
      })

      // Get gas price
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice || ethers.parseUnits("1", "gwei")

      // Calculate total cost (value + gas)
      const gasCost = gasEstimate * gasPrice
      const totalCost = valueInWei + gasCost

      // Check if user has enough balance
      const hasEnoughBalance = currentBalance >= totalCost

      // Calculate balance after transaction
      const balanceAfter = ethers.formatEther(currentBalance - totalCost)

      setSimulationResult({
        success: hasEnoughBalance,
        gasEstimate: `${ethers.formatEther(gasCost)} MON (${gasEstimate.toString()} gas units)`,
        balanceAfter: hasEnoughBalance ? balanceAfter : "Insufficient funds",
        error: hasEnoughBalance ? undefined : "Insufficient funds for this transaction",
      })
    } catch (error: any) {
      console.error("Simulation error:", error)
      setSimulationResult({
        success: false,
        error: error.message || "Failed to simulate transaction",
      })
    } finally {
      setIsSimulating(false)
    }
  }

  const handleSendTransaction = () => {
    onSendTransaction(to, value, data)
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Transaction Simulator</CardTitle>
        </div>
        <CardDescription>
          Simulate a transaction to estimate gas costs and check for potential errors before sending.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="recipient" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Recipient Address
            </Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={isSimulating}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Amount (MON)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.0001"
              placeholder="0.0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isSimulating}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="data" className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Data (Optional)
            </Label>
            <Textarea
              id="data"
              placeholder="0x..."
              value={data}
              onChange={(e) => setData(e.target.value)}
              disabled={isSimulating}
              className="h-20"
            />
          </div>

          {simulationResult && (
            <div
              className={`p-4 rounded-lg border ${
                simulationResult.success
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/30"
                  : "bg-destructive/10 border-destructive/20 dark:bg-destructive/20 dark:border-destructive/30"
              }`}
            >
              <div className="flex items-start">
                {simulationResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 mr-3" />
                )}
                <div>
                  <h4
                    className={`font-medium ${
                      simulationResult.success ? "text-green-800 dark:text-green-300" : "text-destructive"
                    }`}
                  >
                    {simulationResult.success ? "Transaction Simulation Successful" : "Transaction Simulation Failed"}
                  </h4>

                  {simulationResult.gasEstimate && (
                    <p className="text-sm mt-1">
                      <span className="font-medium">Estimated Gas Cost:</span> {simulationResult.gasEstimate}
                    </p>
                  )}

                  {simulationResult.balanceAfter && (
                    <p className="text-sm mt-1">
                      <span className="font-medium">Balance After Transaction:</span> {simulationResult.balanceAfter}{" "}
                      MON
                    </p>
                  )}

                  {simulationResult.error && <p className="text-sm text-destructive mt-1">{simulationResult.error}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={simulateTransaction}
          disabled={isSimulating || !wallet || !to || !to.startsWith("0x")}
        >
          {isSimulating ? "Simulating..." : "Simulate Transaction"}
        </Button>
        <Button
          onClick={handleSendTransaction}
          disabled={!simulationResult?.success || !wallet}
          className="flex items-center"
        >
          Send Transaction <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
