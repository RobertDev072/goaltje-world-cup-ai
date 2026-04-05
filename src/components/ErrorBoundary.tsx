import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
          <p className="text-lg font-semibold">Er is iets misgegaan.</p>
          <button
            className="text-sm underline text-muted-foreground"
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
