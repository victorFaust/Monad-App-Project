"use client"

import { useState, useEffect } from "react"
import { Lightbulb } from "lucide-react"

interface SuggestionListProps {
  inputValue: string
  onSelect: (suggestion: string) => void
}

const SUGGESTIONS = [
  "Show network status",
  "Check balance of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "What's the current gas price?",
  "Send 0.1 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "Connect my wallet",
  "Help me understand how to use this interface",
]

export function SuggestionList({ inputValue, onSelect }: SuggestionListProps) {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (!inputValue) {
      setFilteredSuggestions([])
      return
    }

    const filtered = SUGGESTIONS.filter((suggestion) => suggestion.toLowerCase().includes(inputValue.toLowerCase()))
    setFilteredSuggestions(filtered)
  }, [inputValue])

  if (filteredSuggestions.length === 0) {
    return null
  }

  return (
    <div className="absolute bottom-full left-0 right-0 bg-card dark:bg-card border border-border rounded-lg p-2 mb-2 shadow-lg z-10">
      <div className="flex items-center text-sm text-muted-foreground mb-1">
        <Lightbulb className="h-4 w-4 mr-1" />
        <span>Suggested commands:</span>
      </div>
      <div className="suggestions-list space-y-1">
        {filteredSuggestions.map((suggestion, index) => (
          <div
            key={index}
            className="p-2 hover:bg-accent dark:hover:bg-accent cursor-pointer rounded text-foreground"
            onClick={() => onSelect(suggestion)}
          >
            {suggestion}
          </div>
        ))}
      </div>
    </div>
  )
}
