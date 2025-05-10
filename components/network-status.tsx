"use client"

import { useState } from "react"
import { Activity, Database, Cpu, Wallet } from "lucide-react"
import type { NetworkStatusInfo } from "@/types/network"
import type { WalletInfo } from "@/types/wallet"
import { NetworkSelector } from "@/components/network-selector"
import { formatAddress } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface NetworkStatusProps {
  networkStatus: NetworkStatusInfo
  wallet: WalletInfo | null
}

export function NetworkStatus({ networkStatus, wallet }: NetworkStatusProps) {
  const [currentNetworkId, setCurrentNetworkId] = useState("monad-testnet-1")
  const { toast } = useToast()

  const handleNetworkChange = (network: { id: string; name: string; rpcUrl: string }) => {
    setCurrentNetworkId(network.id)

    // In a real app, we would actually switch networks here
    toast({
      title: "Network Changed",
      description: `Switched to ${network.name}`,
    })

    // For demo purposes, we'll just show a toast
    // In a real implementation, we would update the provider and reconnect
  }

  return (
    <div className="bg-muted dark:bg-muted p-3 flex justify-between items-center text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4" />
        <span className="font-semibold">Network:</span>
        <NetworkSelector currentNetwork={currentNetworkId} onNetworkChange={handleNetworkChange} />
      </div>
      <div className="flex items-center gap-1">
        <Database className="h-4 w-4" />
        <span className="font-semibold">Block:</span>
        <span id="block-number">{networkStatus.blockNumber || "--"}</span>
      </div>
      <div className="flex items-center gap-1">
        <Cpu className="h-4 w-4" />
        <span className="font-semibold">Gas Price:</span>
        <span id="gas-price">{networkStatus.gasPriceGwei || "--"}</span> Gwei
      </div>
      {wallet && (
        <div className="flex items-center gap-1">
          <Wallet className="h-4 w-4" />
          <span className="font-semibold">Wallet:</span>
          <span id="wallet-address">{formatAddress(wallet.address)}</span>
        </div>
      )}
    </div>
  )
}
