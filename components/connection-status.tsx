"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showStatus, setShowStatus] = useState(false)

  useEffect(() => {
    // Set initial status
    setIsOnline(navigator.onLine)

    // Add event listeners for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Show status briefly when connection is restored
      setShowStatus(true)
      setTimeout(() => setShowStatus(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      // Always show status when offline
      setShowStatus(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!showStatus) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300",
        isOnline
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
          : "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground",
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Offline - Some features may be unavailable</span>
        </>
      )}
    </div>
  )
}
