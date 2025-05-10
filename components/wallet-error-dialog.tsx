"use client"

import { AlertTriangle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type WalletErrorType, getWalletErrorTroubleshooting } from "@/lib/wallet-errors"

interface WalletErrorDialogProps {
  isOpen: boolean
  onClose: () => void
  errorType: WalletErrorType
  errorMessage: string
  walletType?: string
}

export function WalletErrorDialog({
  isOpen,
  onClose,
  errorType,
  errorMessage,
  walletType = "wallet",
}: WalletErrorDialogProps) {
  const troubleshootingSteps = getWalletErrorTroubleshooting(errorType)

  // Get wallet-specific help links
  const getHelpLink = () => {
    switch (walletType.toLowerCase()) {
      case "metamask":
        return "https://metamask.io/faqs/"
      case "phantom":
        return "https://help.phantom.app/"
      case "coinbase":
        return "https://help.coinbase.com/en/wallet"
      case "trustwallet":
        return "https://trustwallet.com/help-center"
      default:
        return null
    }
  }

  const helpLink = getHelpLink()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Wallet Connection Error
          </DialogTitle>
          {/* Removed the custom close button here */}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-md">
            <p className="text-amber-800 dark:text-amber-300 font-medium">{errorMessage}</p>
          </div>

          {troubleshootingSteps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Try these troubleshooting steps:</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {troubleshootingSteps.map((step, index) => (
                  <li key={index} className="text-muted-foreground">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {helpLink && (
            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a
                  href={helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit {walletType} Help Center
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
