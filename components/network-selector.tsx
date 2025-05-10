"use client"

import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Network {
  id: string
  name: string
  rpcUrl: string
  isTestnet: boolean
}

interface NetworkSelectorProps {
  currentNetwork: string
  onNetworkChange: (network: Network) => void
}

// Default networks with valid RPC URLs
const NETWORKS: Network[] = [
  {
    id: "monad-testnet-1",
    name: "Monad Testnet 1",
    rpcUrl: "https://testnet-rpc.monad.xyz",
    isTestnet: true,
  },
  {
    id: "monad-testnet-2",
    name: "Monad Testnet 2",
    rpcUrl: "https://rpc.monad-testnet-2.monad.xyz/",
    isTestnet: true,
  },
  {
    id: "monad-local",
    name: "Monad Local",
    rpcUrl: "http://localhost:8545",
    isTestnet: true,
  },
]

export function NetworkSelector({ currentNetwork, onNetworkChange }: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedNetwork = NETWORKS.find((network) => network.id === currentNetwork) || NETWORKS[0]

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 h-8 px-3 border-dashed">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-xs font-medium">{selectedNetwork.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {NETWORKS.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => {
              onNetworkChange(network)
              setIsOpen(false)
            }}
            className={cn("flex items-center gap-2 cursor-pointer", network.id === currentNetwork && "font-medium")}
          >
            <div className="flex items-center flex-1">
              <div
                className={cn("w-2 h-2 rounded-full mr-2", network.isTestnet ? "bg-amber-500" : "bg-green-500")}
              ></div>
              <span>{network.name}</span>
            </div>
            {network.id === currentNetwork && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
