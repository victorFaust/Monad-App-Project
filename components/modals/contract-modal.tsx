"use client"

import { useState, useEffect, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { callContract } from "@/lib/api"
import type { WalletInfo } from "@/types/wallet"
import { TransactionContext } from "@/contexts/transaction-context"

interface ContractModalProps {
  isOpen: boolean
  onClose: () => void
  initialAddress: string
  wallet: WalletInfo | null
}

interface ContractMethod {
  name: string
  signature: string
  stateMutability: string
  inputs: Array<{
    name: string
    type: string
  }>
}

export function ContractModal({ isOpen, onClose, initialAddress, wallet }: ContractModalProps) {
  const [address, setAddress] = useState(initialAddress)
  const [abi, setAbi] = useState("")
  const [methods, setMethods] = useState<ContractMethod[]>([])
  const [selectedMethod, setSelectedMethod] = useState("")
  const [params, setParams] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { addTransaction } = useContext(TransactionContext)

  useEffect(() => {
    setAddress(initialAddress)
  }, [initialAddress])

  const parseAbi = () => {
    try {
      const parsedAbi = JSON.parse(abi)
      const contractMethods: ContractMethod[] = []

      parsedAbi.forEach((item: any) => {
        if (item.type === "function") {
          // Create method signature
          let signature = `${item.name}(`
          signature += item.inputs.map((input: any) => `${input.type} ${input.name}`).join(", ")
          signature += ")"

          if (item.outputs && item.outputs.length > 0) {
            signature += " returns ("
            signature += item.outputs.map((output: any) => output.type).join(", ")
            signature += ")"
          }

          contractMethods.push({
            name: item.name,
            signature,
            stateMutability: item.stateMutability || "",
            inputs: item.inputs || [],
          })
        }
      })

      setMethods(contractMethods)
      setStatus({ message: "ABI parsed successfully. Select a method to continue.", isError: false })
    } catch (error) {
      setStatus({ message: "Invalid ABI format. Please check your input.", isError: true })
      setMethods([])
    }
  }

  const handleMethodChange = (value: string) => {
    setSelectedMethod(value)
    setParams({})
  }

  const handleParamChange = (index: number, value: string) => {
    setParams((prev) => ({ ...prev, [index]: value }))
  }

  const handleSubmit = async () => {
    if (!address || !address.startsWith("0x")) {
      setStatus({ message: "Invalid contract address", isError: true })
      return
    }

    if (!selectedMethod) {
      setStatus({ message: "Please select a method", isError: true })
      return
    }

    setStatus({ message: "Calling contract method...", isError: false })
    setIsSubmitting(true)

    try {
      // Get the selected method details
      const method = methods.find((m) => m.name === selectedMethod)
      if (!method) {
        throw new Error("Method not found")
      }

      // Collect parameters
      const methodParams = method.inputs.map((_, index) => params[index] || "")

      const result = await callContract(address, abi, selectedMethod, methodParams)

      if (result.success) {
        setStatus({
          message: `Method call successful! Result: ${JSON.stringify(result.data.result)}`,
          isError: false,
        })

        // Add to transaction history if it's a state-changing method
        if (method.stateMutability === "nonpayable" || method.stateMutability === "payable") {
          addTransaction({
            hash: result.data.transactionHash || `contract-${Date.now()}`,
            from: wallet?.address || "",
            to: address,
            value: `Contract Call: ${selectedMethod}`,
            timestamp: Date.now(),
            status: "confirmed",
          })
        }

        toast({
          title: "Contract Call Successful",
          description: `Method ${selectedMethod} executed successfully`,
        })
      } else {
        setStatus({ message: `Error: ${result.error}`, isError: true })
      }
    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, isError: true })
      toast({
        title: "Contract Call Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderMethodParams = () => {
    if (!selectedMethod) return null

    const method = methods.find((m) => m.name === selectedMethod)
    if (!method) return null

    return (
      <div className="space-y-4 mt-4">
        <h3 className="text-sm font-medium">Method Parameters</h3>
        {method.inputs.map((input, index) => (
          <div key={index} className="grid gap-2">
            <Label htmlFor={`param-${index}`}>
              {input.name || `param${index}`} ({input.type})
            </Label>
            <Input
              id={`param-${index}`}
              placeholder={input.type}
              value={params[index] || ""}
              onChange={(e) => handleParamChange(index, e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contract Interaction</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contract-address">Contract Address</Label>
            <Input
              id="contract-address"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contract-abi">Contract ABI</Label>
            <Textarea
              id="contract-abi"
              placeholder="[...]"
              value={abi}
              onChange={(e) => setAbi(e.target.value)}
              disabled={isSubmitting}
              className="h-32"
            />
            <Button variant="outline" onClick={parseAbi} disabled={isSubmitting || !abi}>
              Parse ABI
            </Button>
          </div>

          {methods.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="contract-method">Method</Label>
              <Select value={selectedMethod} onValueChange={handleMethodChange} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Select Method --" />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((method, index) => (
                    <SelectItem key={index} value={method.name}>
                      {method.signature}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {renderMethodParams()}

          {status && (
            <div
              className={`p-3 rounded-lg ${
                status.isError ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
              } dark:${status.isError ? "bg-red-900/30 text-red-300" : "bg-green-900/30 text-green-300"}`}
            >
              {status.message}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedMethod}>
            {isSubmitting ? "Calling..." : "Call Method"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
