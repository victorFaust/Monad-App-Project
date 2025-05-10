"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatMessage } from "@/components/chat-message"
import { SuggestionList } from "@/components/suggestion-list"
import type { WalletInfo } from "@/types/wallet"
import { useToast } from "@/hooks/use-toast"
import { processCommand } from "@/lib/command-processor"

interface ChatInterfaceProps {
  wallet: WalletInfo | null
  onSendTransaction: (to: string, value: string, data: string) => void
  onContractInteraction: (address: string) => void
  onOpenWalletModal: () => void
}

export function ChatInterface({
  wallet,
  onSendTransaction,
  onContractInteraction,
  onOpenWalletModal,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<
    Array<{ text: string; sender: "user" | "system"; isLoading?: boolean; isError?: boolean }>
  >([
    {
      sender: "system",
      text: `👋 Welcome to the Monad MCP Interface! You can:
      <ul class="list-disc pl-5 mt-2">
        <li>Type natural language commands like "Check balance of 0x123..."</li>
        <li>Connect your wallet to send transactions</li>
        <li>Interact with contracts on Monad Testnet</li>
        <li>Try saying "Show me network status" to get started</li>
      </ul>`,
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setShowSuggestions(e.target.value.length > 0)
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    // Add user message
    setMessages((prev) => [...prev, { text: inputValue, sender: "user" }])

    // Add loading message
    setMessages((prev) => [...prev, { text: "Processing your request", sender: "system", isLoading: true }])

    // Clear input
    setInputValue("")
    setShowSuggestions(false)
    setIsProcessing(true)

    try {
      // Process the command with a timeout and fallback mechanism
      const result = await Promise.race([
        processCommand(inputValue, {
          wallet,
          onSendTransaction,
          onContractInteraction,
          onOpenWalletModal,
        }),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), 15000)),
      ])

      // Remove loading message and add response
      setMessages((prev) => {
        const newMessages = [...prev]
        // Remove the loading message
        newMessages.pop()
        // Add the response
        newMessages.push({ text: result, sender: "system" })
        return newMessages
      })
    } catch (error: any) {
      console.error("Command processing error:", error)

      // Remove loading message and add error
      setMessages((prev) => {
        const newMessages = [...prev]
        // Remove the loading message
        newMessages.pop()
        // Add the error message
        newMessages.push({
          text: `<div class="flex items-center gap-2 text-destructive">
            <span class="flex-shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>
            <span>I'll handle this directly without AI assistance. ${
              error.message.includes("Failed to fetch") || error.message.includes("OpenAI")
                ? "The AI service is currently unavailable."
                : ""
            }</span>
          </div>`,
          sender: "system",
          isError: true,
        })

        // Add a follow-up message with direct help
        newMessages.push({
          text: `<div>
            <p>Here are some commands you can try:</p>
            <ul class="list-disc pl-5 mt-2">
              <li>"Show network status"</li>
              <li>"Check balance of 0x..."</li>
              <li>"What's the current gas price?"</li>
              <li>"Connect my wallet"</li>
            </ul>
          </div>`,
          sender: "system",
        })

        return newMessages
      })

      // Only show toast for non-AI errors to avoid confusion
      if (!error.message.includes("Failed to fetch") && !error.message.includes("OpenAI")) {
        toast({
          title: "Command Processing Error",
          description: error.message || "Failed to process command",
          variant: "destructive",
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setInputValue(suggestion)
    setShowSuggestions(false)
  }

  const handleRetry = () => {
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex((msg) => msg.sender === "user")
    if (lastUserMessageIndex >= 0) {
      const lastUserMessage = messages[messages.length - 1 - lastUserMessageIndex]
      setInputValue(lastUserMessage.text)
    }
  }

  return (
    <div className="chat-container">
      {/* Main Chat Area */}
      <div ref={chatContainerRef} className="chat-messages">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            message={message.text}
            sender={message.sender}
            isLoading={message.isLoading}
            isError={message.isError}
          />
        ))}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="chat-input-container">
        <div className="flex">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your command or question here..."
            className="flex-grow p-3 rounded-l-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSendMessage}
            className="bg-primary text-primary-foreground px-6 rounded-r-lg hover:bg-primary/90 transition"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        {showSuggestions && <SuggestionList inputValue={inputValue} onSelect={selectSuggestion} />}
      </div>
    </div>
  )
}
