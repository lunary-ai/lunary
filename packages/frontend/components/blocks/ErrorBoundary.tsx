import React, { ReactNode } from "react"
import * as Sentry from "@sentry/nextjs"

interface ErrorBoundaryState {
  hasError: boolean
}

interface ErrorBoundaryProps {
  children: ReactNode
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Sentry.captureUnderscoreErrorException(contextData)
    console.error(error, errorInfo)
  }

  render() {
    console.log("HERE")
    return (
      <Sentry.ErrorBoundary fallback={<p>Error rendering this component</p>}>
        {this.props.children}
      </Sentry.ErrorBoundary>
    )
  }
}

export default ErrorBoundary
