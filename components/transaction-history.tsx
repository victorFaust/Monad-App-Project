"use client"

import { useState, useEffect, useContext } from "react"
import { ExternalLink, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { formatAddress } from "@/lib/utils"
import type { WalletInfo } from "@/types/wallet"
import { TransactionContext } from "@/contexts/transaction-context"

interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  timestamp: number
  status: "pending" | "confirmed" | "failed"
  gasUsed?: string
  blockNumber?: string
}

interface TransactionHistoryProps {
  wallet: WalletInfo | null
}

export function TransactionHistory({ wallet }: TransactionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { transactions, setTransactions } = useContext(TransactionContext)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (wallet) {
      // Auto-open when transactions occur
      if (transactions.length > 0) {
        setIsOpen(true)
      }
    } else {
      setTransactions([])
    }
  }, [wallet, transactions.length, setTransactions])

  if (!wallet) {
    return null
  }

  return (
    <Card className="mt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-3">
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Transaction History</CardTitle>
                {transactions.length > 0 && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {transactions.length}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading transactions...</span>
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.hash}
                    className="rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {tx.status === "pending" ? (
                          <Clock className="mr-2 h-4 w-4 text-amber-500" />
                        ) : tx.status === "confirmed" ? (
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm font-medium">
                          {tx.value} MON to {formatAddress(tx.to)}
                        </span>
                      </div>
                      <a
                        href={`https://explorer.monad.xyz/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                        aria-label="View transaction on explorer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>Tx: {formatAddress(tx.hash)}</span>
                        {tx.blockNumber && <span>Block: {tx.blockNumber}</span>}
                        {tx.gasUsed && <span>Gas Used: {tx.gasUsed}</span>}
                        <span>
                          {new Date(tx.timestamp).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No transactions found for this wallet.
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
