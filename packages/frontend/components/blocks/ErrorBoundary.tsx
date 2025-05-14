import React, { ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error);
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <p>Error rendering this component</p>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
