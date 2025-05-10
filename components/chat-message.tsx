"use client"

import { AlertTriangle, User, Bot } from "lucide-react"

interface ChatMessageProps {
  message: string
  sender: "user" | "system"
  isLoading?: boolean
  isError?: boolean
}

export function ChatMessage({ message, sender, isLoading = false, isError = false }: ChatMessageProps) {
  return (
    <div
      className={`chat-message ${
        sender === "user"
          ? "user-message bg-accent/50 dark:bg-accent/20 border-l-4 border-primary"
          : isError
            ? "system-message bg-destructive/10 dark:bg-destructive/20 border-l-4 border-destructive"
            : "system-message bg-muted dark:bg-muted/50 border-l-4 border-muted-foreground"
      } p-3 rounded-lg transition-all duration-300 ease-in-out`}
    >
      {sender === "user" ? (
        <div className="flex">
          <div className="flex-shrink-0 mr-2">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-foreground">{message}</p>
          </div>
        </div>
      ) : (
        <div className="flex">
          <div className="flex-shrink-0 mr-2">
            <div
              className={`h-6 w-6 rounded-full ${isError ? "bg-destructive" : "bg-muted-foreground"} flex items-center justify-center text-white`}
            >
              {isError ? <AlertTriangle className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
          </div>
          <div className="flex-1">
            {isLoading ? (
              <p className="text-foreground">
                {message}
                <span className="loading-dots inline-block ml-1 after:content-[''] after:animate-dots"></span>
              </p>
            ) : (
              <div className="text-foreground" dangerouslySetInnerHTML={{ __html: message }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
