"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  componentName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.componentName || "component"}:`, error, errorInfo)
  }

  resetErrorBoundary = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 dark:border-destructive/30 dark:bg-destructive/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-sm font-medium text-destructive">
              {this.props.componentName ? `Error in ${this.props.componentName}` : "Something went wrong"}
            </h3>
          </div>
          <div className="mt-2 text-sm text-destructive/80">
            {this.state.error?.message || "An unexpected error occurred"}
          </div>
          <div className="mt-4">
            <Button size="sm" variant="outline" onClick={this.resetErrorBoundary} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
