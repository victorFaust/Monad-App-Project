"use client"

import { createContext, useState, useEffect, type ReactNode } from "react"

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

interface TransactionContextType {
  transactions: Transaction[]
  addTransaction: (transaction: Transaction) => void
  updateTransaction: (hash: string, updates: Partial<Transaction>) => void
  clearTransactions: () => void
}

export const TransactionContext = createContext<TransactionContextType>({
  transactions: [],
  addTransaction: () => {},
  updateTransaction: () => {},
  clearTransactions: () => {},
})

interface TransactionProviderProps {
  children: ReactNode
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Load transactions from localStorage on mount
  useEffect(() => {
    const savedTransactions = localStorage.getItem("transactions")
    if (savedTransactions) {
      try {
        setTransactions(JSON.parse(savedTransactions))
      } catch (error) {
        console.error("Failed to parse saved transactions:", error)
      }
    }
  }, [])

  // Save transactions to localStorage when they change
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem("transactions", JSON.stringify(transactions))
    }
  }, [transactions])

  const addTransaction = (transaction: Transaction) => {
    setTransactions((prev) => [transaction, ...prev])
  }

  const updateTransaction = (hash: string, updates: Partial<Transaction>) => {
    setTransactions((prev) => prev.map((tx) => (tx.hash === hash ? { ...tx, ...updates } : tx)))
  }

  const clearTransactions = () => {
    setTransactions([])
    localStorage.removeItem("transactions")
  }

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, updateTransaction, clearTransactions }}>
      {children}
    </TransactionContext.Provider>
  )
}
