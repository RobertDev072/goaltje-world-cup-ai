import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || "" };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4 bg-background">
          <p className="text-lg font-semibold">Er is iets misgegaan.</p>
          {this.state.errorMessage && (
            <p className="text-xs text-muted-foreground max-w-xs">{this.state.errorMessage}</p>
          )}
          <button
            className="text-sm underline text-primary"
            onClick={() => this.setState({ hasError: false, errorMessage: "" })}
          >
            Opnieuw proberen
          </button>
          <button
            className="text-xs underline text-muted-foreground"
            onClick={() => window.location.reload()}
          >
            Pagina herladen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
