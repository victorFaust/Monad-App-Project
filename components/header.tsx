"use client"

import { useState } from "react"
import Link from "next/link"
import { Moon, Sun, Wallet } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { WalletModal } from "@/components/modals/wallet-modal"
import { useWallet } from "@/hooks/use-wallet"
import { formatAddress } from "@/lib/utils"
import { WalletErrorDialog } from "@/components/wallet-error-dialog"

export function Header() {
  const { theme, setTheme } = useTheme()
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const { wallet, connectWallet, disconnectWallet, isConnecting, walletError, clearWalletError } = useWallet()

  const handleConnectWallet = async (walletType: string) => {
    const success = await connectWallet(walletType)
    if (success) {
      setIsWalletModalOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">Monad MCP Interface</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="mr-2"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button
            variant={wallet ? "outline" : "default"}
            onClick={() => setIsWalletModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            {wallet ? formatAddress(wallet.address) : "Connect Wallet"}
          </Button>
        </div>
      </div>
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={handleConnectWallet}
        onDisconnect={disconnectWallet}
        wallet={wallet}
        isConnecting={isConnecting}
        walletError={walletError}
      />
      <WalletErrorDialog error={walletError} isOpen={!!walletError && !isWalletModalOpen} onClose={clearWalletError} />
    </header>
  )
}
