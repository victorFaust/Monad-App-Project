"use client"

import { useState } from "react"
import { Check, Wallet, LogOut, RefreshCw, AlertTriangle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatAddress } from "@/lib/utils"
import type { WalletInfo } from "@/types/wallet"
import type { WalletErrorType } from "@/lib/wallet-errors"

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (walletType: string) => Promise<boolean>
  onDisconnect: () => void
  wallet: WalletInfo | null
  isConnecting: boolean
  lastError?: {
    type: WalletErrorType
    message: string
    troubleshooting: string[]
  } | null
  walletError?: {
    type: WalletErrorType
    message: string
    walletType?: string
    isUserRejection?: boolean
  } | null
}

// Wallet options with metadata
const WALLET_OPTIONS = [
  {
    id: "metamask",
    name: "MetaMask",
    description: "Connect to your MetaMask wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjM1NSIgdmlld0JveD0iMCAwIDM5NyAzNTUiIHdpZHRoPSIzOTciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMSAtMSkiPjxwYXRoIGQ9Im0xMTQuNjIyNjQ0IDMyNy4xOTU0NzIgNTIuMDA0NzE3IDEzLjgxMDE5OHYtMTguMDU5NDlsNC4yNDUyODMtNC4yNDkyOTJoMjkuNzE2OTgydjIxLjI0NjQ1OSAxNC44NzI1MjNoLTMxLjgzOTYyNGwtMzkuMjY4ODY4LTE2Ljk5NzE2OXoiIGZpbGw9IiNjZGJkYjIiLz48cGF0aCBkPSJtMTk5LjUyODMwNSAzMjcuMTk1NDcyIDUwLjk0MzM5NyAxMy44MTAxOTh2LTE4LjA1OTQ5bDQuMjQ1MjgzLTQuMjQ5MjkyaDI5LjcxNjk4MXYyMS4yNDY0NTkgMTQuODcyNTIzaC0zMS44Mzk2MjNsLTM5LjI2ODg2OC0xNi45OTcxNjl6IiBmaWxsPSIjY2RiZGIyIiB0cmFuc2Zvcm09Im1hdHJpeCgtMSAwIDAgMSA0ODMuOTYyMjcgMCkiLz48cGF0aCBkPSJtMTcwLjg3MjY0NCAyODcuODg5NTIzLTQuMjQ1MjgzIDM1LjA1NjY1NyA1LjMwNjYwNC00LjI0OTI5Mmg1NS4xODg2OEwyMzMuMTkwNiAyOTMuMTk4ODJsLTQuMjQ1Mjg0LTM1LjA5NjY1Ny04LjQ5MDU2NS01LjMxMTYxNS00Mi40NTI4MzIgMS4wNjIzMjN6IiBmaWxsPSIjMzkzOTM5Ii8+PHBhdGggZD0ibTE0Mi4yMTY5ODQgNTAuOTkxNTAyMiAyNS40NzE2OTggNTkuNDkwMDg1OCAxMS42NzQ1MjggMTczLjE1ODY0M2g0MS4zOTE1MTFsMTIuNzM1ODQ5LTE3My4xNTg2NDMgMjMuMzQ5MDU2LTU5LjQ5MDA4NTh6IiBmaWxsPSIjZjg5YzM1Ii8+PHBhdGggZD0ibTMwLjc3ODMwMjMgMTgxLjY1NzIyNi0yOS43MTY5ODE1MyA4Ni4wNDgxNjEgNzQuMjkyNDUzOTMtNC4yNDkyOTNoNDcuNzU5NDM0M3YtMzcuMTgxMzAzbC0yLjEyMjY0MS03Ni40ODcyNTMtMTAuNjEzMjA4IDguNDk4NTgzeiIgZmlsbD0iI2Y4OWQzNSIvPjxwYXRoIGQ9Im04Ny4wMjgzMDMyIDE5MS4yMTgxMzQgODcuMDI4MzAyOCAyLjEyNDY0Ni05LjU1MTg4NiA0NC42MTc1NjMtNDEuMzkxNTExLTEwLjYyMzIyOXoiIGZpbGw9IiNkODdjMzAiLz48cGF0aCBkPSJtODcuMDI4MzAzMiAxOTIuMjgwNDU3IDM2LjA4NDkwNTggMzMuOTk0MzM0djMzLjk5NDMzNHoiIGZpbGw9IiNlYThkM2EiLz48cGF0aCBkPSJtMTIzLjExMzIwOSAyMjcuMzM3MTE0IDQyLjQ1MjgzMSAxMC42MjMyMjkgMTMuNzk3MTcgNDUuNjc5ODg2LTkuNTUxODg2IDUuMzExNjE1LTQ2LjY5ODExNS0yNy42MjAzOTh6IiBmaWxsPSIjZjg5ZDM1Ii8+PHBhdGggZD0ibTEyMy4xMTMyMDkgMjYxLjMzMTQ0OC04LjQ5MDU2NSA2NS44NjQwMjQgNTYuMjUtMzkuMzA1OTQ5eiIgZmlsbD0iI2ViOGYzNSIvPjxwYXRoIGQ9Im0xNzQuMDU2NjA2IDE5My4zNDI3OCA1LjMwNjYwNCA5MC4yOTc0NTgtMTUuOTE5ODEyLTQ2LjIxMTA0OXoiIGZpbGw9IiNlYThlM2EiLz48cGF0aCBkPSJtNzQuMjkyNDUzOSAyNjIuMzkzNzcxIDQ4LjgyMDc1NTEtMS4wNjIzMjMtOC40OTA1NjUgNjUuODY0MDI0eiIgZmlsbD0iI2Q4N2MzMCIvPjxwYXRoIGQ9Im0yNC40MTAzNzc3IDM1NS44NzgxOTMgOTAuMjEyMjY2My0yOC42ODI3MjEtNDAuMzMwMTkwMS02NC44MDE3MDEtNzMuMjMxMTMzMTMgNS4zMTE2MTZ6IiBmaWxsPSIjZWI4ZjM1Ii8+PHBhdGggZD0ibTE2Ny42ODg2OCA5My43MzMzODMtNDUuNjM2NzkzIDM4LjI0MzYyNy0zNS4wMjM1ODU4IDUwLjk5MTM0OSA4Ny4wMjgzMDI4IDMuMTg2OTY5eiIgZmlsbD0iI2U4ODIxZSIvPjxwYXRoIGQ9Im0xMzIuNjY1MDk2IDIxMi40NjQ1OTMtMTEuNjc0NTI4IDI0LjQzMzQyNyA0MS4zOTE1MS0xMC42MjMyMjl6IiBmaWxsPSIjMzkzOTM5Ii8+PHBhdGggZD0ibTIzLjM0OTA1NyAxLjA2MjMyMjk2IDE0NC4zMzk2MjMgOTIuNjczMDYwMDQtMjQuNDEwMzc4LTU5LjQ5MDA4NTh6IiBmaWxsPSIjZTg4MjFlIi8+PHBhdGggZD0ibTIzLjM0OTA1NyAxLjA2MjMyMjk2LTE5LjEwMzc3MzkyIDU4LjQyNzc2MjA0IDEwLjYxMzIwNzgyIDYzLjczOTM3OTEtNy40Mjk0MzQxIDQuMjQ5MjkyIDEwLjYxMzIwODIgOS41NjA5MDYtOC40OTA1NjYxIDcuNDM2MjYxIDExLjY3NDUyODIgMTAuNjIzMjI5LTcuNDI5NDM0MSA2LjM3MzkzOCAxNi45ODExMzIgMjEuMjQ2NDU5IDc5LjU5OTA1NzctMjQuNDMzNDI4YzM4LjkxNTA5Ni0zMS4xNjE0NzMgNTguMDE4ODY5LTQ3LjA5NjMxOCA1Ny4zMTEzMjItNDcuODA0NTMzLS43MDc1NDgtLjcwODIxNS00OC44MjA3NTYtMzcuMTgxMzAzNi0xNDQuMzM5NjIzLTEwOS40MTkyNjUwNHoiIGZpbGw9IiM4ZTVhMzAiLz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgtMSAwIDAgMSAzOTkuMDU2NiAwKSI+PHBhdGggZD0ibTMwLjc3ODMwMjMgMTgxLjY1NzIyNi0yOS43MTY5ODE1MyA4Ni4wNDgxNjEgNzQuMjkyNDUzOTMtNC4yNDkyOTNoNDcuNzU5NDM0M3YtMzcuMTgxMzAzbC0yLjEyMjY0MS03Ni40ODcyNTMtMTAuNjEzMjA4IDguNDk4NTgzeiIgZmlsbD0iI2Y4OWQzNSIvPjxwYXRoIGQ9Im04Ny4wMjgzMDMyIDE5MS4yMTgxMzQgODcuMDI4MzAyOCAyLjEyNDY0Ni05LjU1MTg4NiA0NC42MTc1NjMtNDEuMzkxNTExLTEwLjYyMzIyOXoiIGZpbGw9IiNkODdjMzAiLz48cGF0aCBkPSJtODcuMDI4MzAzMiAxOTIuMjgwNDU3IDM2LjA4NDkwNTggMzMuOTk0MzM0djMzLjk5NDMzNHoiIGZpbGw9IiNlYThkM2EiLz48cGF0aCBkPSJtMTIzLjExMzIwOSAyMjcuMzM3MTE0IDQyLjQ1MjgzMSAxMC42MjMyMjkgMTMuNzk3MTcgNDUuNjc5ODg2LTkuNTUxODg2IDUuMzExNjE1LTQ2LjY5ODExNS0yNy42MjAzOTh6IiBmaWxsPSIjZjg5ZDM1Ii8+PHBhdGggZD0ibTEyMy4xMTMyMDkgMjYxLjMzMTQ0OC04LjQ5MDU2NSA2NS44NjQwMjQgNTYuMjUtMzkuMzA1OTQ5eiIgZmlsbD0iI2ViOGYzNSIvPjxwYXRoIGQ9Im0xNzQuMDU2NjA2IDE5My4zNDI3OCA1LjMwNjYwNCA5MC4yOTc0NTgtMTUuOTE5ODEyLTQ2LjIxMTA0OXoiIGZpbGw9IiNlYThlM2EiLz48cGF0aCBkPSJtNzQuMjkyNDUzOSAyNjIuMzkzNzcxIDQ4LjgyMDc1NTEtMS4wNjIzMjMtOC40OTA1NjUgNjUuODY0MDI0eiIgZmlsbD0iI2Q4N2MzMCIvPjxwYXRoIGQ9Im0yNC40MTAzNzc3IDM1NS44NzgxOTMgOTAuMjEyMjY2My0yOC42ODI3MjEtNDAuMzMwMTkwMS02NC44MDE3MDEtNzMuMjMxMTMzMTMgNS4zMTE2MTZ6IiBmaWxsPSIjZWI4ZjM1Ii8+PHBhdGggZD0ibTE2Ny42ODg2OCA5My43MzUzODMtNDUuNjM2NzkzIDM4LjI0MzYyNy0zNS4wMjM1ODU4IDUwLjk5MTM0OSA4Ny4wMjgzMDI4IDMuMTg2OTY5eiIgZmlsbD0iI2U4ODIxZSIvPjxwYXRoIGQ9Im0xMzIuNjY1MDk2IDIxMi40NjQ1OTMtMTEuNjc0NTI4IDI0LjQzMzQyNyA0MS4zOTE1MS0xMC42MjMyMjl6IiBmaWxsPSIjMzkzOTM5Ii8+PHBhdGggZD0ibTIzLjM0OTA1NyAxLjA2MjMyMjk2IDE0NC4zMzk2MjMgOTIuNjczMDYwMDQtMjQuNDEwMzc4LTU5LjQ5MDA4NTh6IiBmaWxsPSIjZTg4MjFlIi8+PHBhdGggZD0ibTIzLjM0OTA1NyAxLjA2MjMyMjk2LTE5LjEwMzc3MzkyIDU4LjQyNzc2MjA0IDEwLjYxMzIwNzgyIDYzLjczOTM3OTEtNy40Mjk0MzQxIDQuMjQ5MjkyIDEwLjYxMzIwODIgOS41NjA5MDYtOC40OTA1NjYxIDcuNDM2MjYxIDExLjY3NDUyODIgMTAuNjIzMjI5LTcuNDI5NDM0MSA2LjM3MzkzOCAxNi45ODExMzIgMjEuMjQ2NDU5IDc5LjU5OTA1NzctMjQuNDMzNDI4YzM4LjkxNTA5Ni0zMS4xNjE0NzMgNTguMDE4ODY5LTQ3LjA5NjMxOCA1Ny4zMTEzMjItNDcuODA0NTMzLS43MDc1NDgtLjcwODIxNS00OC44MjA3NTYtMzcuMTgxMzAzNi0xNDQuMzM5NjIzLTEwOS40MTkyNjUwNHoiIGZpbGw9IiM4ZTVhMzAiLz48L2c+PC9nPjwvc3ZnPg==",
    detectionMethod: "ethereum.isMetaMask",
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    description: "Connect to your Coinbase Wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8Y2lyY2xlIGN4PSI1MTIiIGN5PSI1MTIiIHI9IjUxMiIgZmlsbD0iIzAwNTJGRiIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTE1MiA1MTJDMTUyIDcwNS45MSAzMTguMDkgODcyIDUxMiA4NzJDNzA1LjkxIDg3MiA4NzIgNzA1LjkxIDg3MiA1MTJDODcyIDMxOC4wOSA3MDUuOTEgMTUyIDUxMiAxNTJDMzE4LjA5IDE1MiAxNTIgMzE4LjA5IDE1MiA1MTJaTTQyMCA0MTJDNDIwIDM5NS40MyA0MzMuNDMgMzgyIDQ1MCAzODJINTc0QzU5MC41NyAzODIgNjA0IDM5NS40MyA2MDQgNDEyVjYxMkM2MDQgNjI4LjU3IDU5MC41NyA2NDIgNTc0IDY0Mkg0NTBDNDMzLjQzIDY0MiA0MjAgNjI4LjU3IDQyMCA2MTJWNDEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==",
    detectionMethod: "ethereum.isCoinbaseWallet",
  },
  {
    id: "phantom",
    name: "Phantom",
    description: "Connect to your Phantom wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSI5OS42MTYlIiB4Mj0iMTAuNDMlIiB5MT0iOC44MjglIiB5Mj0iOTEuMTU1JSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM1MzNDQjEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNTUxQkY5Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgZmlsbD0idXJsKCNhKSIgcng9IjY0Ii8+CiAgPHBhdGggZmlsbD0iI0ZGRiIgZD0iTTg4LjMwNTEgNDQuNzc0NWMxLjA3MzQgMCAxLjk0MzYuODcwMiAxLjk0MzYgMS45NDM2djcuNTU1MmMwIDEuMDczNC0uODcwMiAxLjk0MzYtMS45NDM2IDEuOTQzNmgtNy41NTUyYy0xLjA3MzQgMC0xLjk0MzYtLjg3MDItMS45NDM2LTEuOTQzNnYtNy41NTUyYzAtMS4wNzM0Ljg3MDItMS45NDM2IDEuOTQzNi0xLjk0MzZoNy41NTUyWm0tMTkuNzI0OCAwYzEuMDczNCAwIDEuOTQzNi44NzAyIDEuOTQzNiAxLjk0MzZ2Ny41NTUyYzAgMS4wNzM0LS44NzAyIDEuOTQzNi0xLjk0MzYgMS45NDM2aC03LjU1NTJjLTEuMDczNCAwLTEuOTQzNi0uODcwMi0xLjk0MzYtMS45NDM2di03LjU1NTJjMC0xLjA3MzQuODcwMi0xLjk0MzYgMS45NDM2LTEuOTQzNmg3LjU1NTJaIi8+CiAgPHBhdGggZmlsbD0iI0ZGRiIgZD0iTTY0IDMyLjAwMDNjMTcuNjczMSAwIDMyIDE0LjMyNzIgMzIgMzJzLTE0LjMyNjkgMzItMzIgMzItMzItMTQuMzI3Mi0zMi0zMiAxNC4zMjY5LTMyIDMyLTMyWm0yNC42MzI4IDM4Ljc3NDJjMCAxLjA3MzQtLjg3MDIgMS45NDM2LTEuOTQzNiAxLjk0MzZoLTQuODU5Yy0uNDQ4NSAwLS44NzY4LS4xODU3LTEuMTg0OC0uNTE0MWwtMTAuNjc5My0xMS42NjE0Yy0uNDg0Mi0uNTI4Ni0xLjQzNDYtLjUyODYtMS45MTg4IDBsLTEwLjY3OTMgMTEuNjYxNGMtLjMwOC4zMjg0LS43MzYzLjUxNDEtMS4xODQ4LjUxNDFoLTQuODU5Yy0xLjA3MzQgMC0xLjk0MzYtLjg3MDItMS45NDM2LTEuOTQzNnYtMTMuNjI3NmMwLTEuMDczNC44NzAyLTEuOTQzNiAxLjk0MzYtMS45NDM2aDQuODU5Yy40NDg1IDAgLjg3NjguMTg1NyAxLjE4NDguNTE0MWwxMC42NzkzIDExLjY2MTRjLjQ4NDIuNTI4NiAxLjQzNDYuNTI4NiAxLjkxODggMGwxMC42NzkzLTExLjY2MTRjLjMwOC0uMzI4NC43MzYzLS41MTQxIDEuMTg0OC0uNTE0MWg0Ljg1OWMxLjA3MzQgMCAxLjk0MzYuODcwMiAxLjk0MzYgMS45NDM2djEzLjYyNzZaIi8+Cjwvc3ZnPgo=",
    detectionMethod: "ethereum.isPhantom",
  },
  {
    id: "trustwallet",
    name: "Trust Wallet",
    description: "Connect to your Trust Wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSIjMDUwMEZGIi8+CjxwYXRoIGQ9Ik0yNTYuMDAxIDc2QzE3OS41MDQgNzYgMTE3LjQ1NSAxMzguMDQ5IDExNy40NTUgMjE0LjU0NkMxMTcuNDU1IDI0Ni4wODQgMTI4LjU5NiAyNzUuNDY3IDE0Ny4zNzEgMjk4LjgzNEMxNjYuMTQ2IDMyMi4yMDEgMTkyLjg2OCAzMzguNzE3IDIyMi4yNTEgMzQzLjI4OEMyMjYuODIyIDM0My44MzggMjMwLjgyNiAzNDEuNzI2IDIzMi4zODQgMzM3LjQzQzIzMy45NDEgMzMzLjEzNCAyMzIuOTM5IDMyOC4yODQgMjI5Ljc1NyAzMjUuMTAyQzIxMi41NDEgMzA3Ljg4NiAyMDIuNDU1IDI4NC41MTkgMjAyLjQ1NSAyNTguNTQ2QzIwMi40NTUgMjE0LjU0NiAyMjYuMDAxIDE3NiAyNTYuMDAxIDE3NkMyODYuMDAxIDE3NiAzMDkuNTQ3IDIxNC41NDYgMzA5LjU0NyAyNTguNTQ2QzMwOS41NDcgMjg0LjUxOSAyOTkuNDYxIDMwNy44ODYgMjgyLjI0NSAzMjUuMTAyQzI3OS4wNjMgMzI4LjI4NCAyNzguMDYxIDMzMy4xMzQgMjc5LjYxOCAzMzcuNDNDMjgxLjE3NiAzNDEuNzI2IDI4NS4xOCAzNDMuODM4IDI4OS43NTEgMzQzLjI4OEMyOTQuMzE5IDM0My43MTkgMjk3LjQzMSAzNDEuNjA3IDI5NS44NzQgMzM3LjMwMUMyOTQuMzE3IDMzMi45OTUgMjk1LjMxOSAzMjguMTQ1IDI5OC41MDEgMzI1LjAxM0MzMTUuNzE3IDMwNy43OTcgMzI1LjgwMyAyODQuNDMgMzI1LjgwMyAyNTguNTQ2QzMyNS44MDMgMjE0LjU0NiAzMDMuMjU3IDE3NiAyNTYuMDAxIDE3NloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPg==",
    detectionMethod: "ethereum.isTrust",
  },
]

export function WalletModal({
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  wallet,
  isConnecting,
  lastError,
  walletError,
}: WalletModalProps) {
  const [selectedWalletType, setSelectedWalletType] = useState<string | null>(null)

  // Handle connecting to a wallet directly when selected
  const handleConnectWallet = async (walletType: string) => {
    setSelectedWalletType(walletType)
    await onConnect(walletType)
    setSelectedWalletType(null)
  }

  // Determine which error to display
  const displayError = walletError || lastError
  const isUserRejection = walletError?.isUserRejection

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {wallet ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Wallet className="h-6 w-6" />
                  <p className="text-sm font-semibold">Connected with {wallet.type}</p>
                </div>
                <Check className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground">Address: {formatAddress(wallet.address)}</p>
              <Button variant="destructive" onClick={onDisconnect} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          ) : (
            WALLET_OPTIONS.map((walletOption) => (
              <Button
                key={walletOption.id}
                variant="outline"
                className="justify-start gap-4"
                onClick={() => handleConnectWallet(walletOption.id)}
                disabled={isConnecting}
              >
                {isConnecting && selectedWalletType === walletOption.id ? (
                  <div className="h-6 w-6 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <img src={walletOption.icon || "/placeholder.svg"} alt={walletOption.name} className="h-6 w-6" />
                )}
                <div className="flex flex-col items-start">
                  <p className="text-sm font-semibold">{walletOption.name}</p>
                  <p className="text-xs text-muted-foreground">{walletOption.description}</p>
                </div>
              </Button>
            ))
          )}
        </div>

        {/* Display user rejection error differently */}
        {isUserRejection && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-sm">
            <div className="mb-2 flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-amber-500" />
              <h4 className="font-semibold text-amber-700 dark:text-amber-400">Connection Declined</h4>
            </div>
            <p className="text-amber-700 dark:text-amber-400">{displayError?.message}</p>
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                className="border-amber-200 bg-amber-100 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400"
                onClick={() => handleConnectWallet(walletError?.walletType || "metamask")}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Display other errors normally */}
        {displayError && !isUserRejection && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
            <div className="mb-2 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <h4 className="font-semibold">Connection Error</h4>
            </div>
            <p className="text-destructive">{displayError.message}</p>
            {lastError?.troubleshooting && lastError.troubleshooting.length > 0 && (
              <div className="mt-2">
                <h5 className="font-semibold">Troubleshooting:</h5>
                <ul className="list-disc pl-5">
                  {lastError.troubleshooting.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          {wallet && (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
