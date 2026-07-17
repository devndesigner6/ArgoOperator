import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  boundary?: string;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`ErrorBoundary caught an error in boundary "${this.props.boundary ?? "app_error_boundary"}":`, error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return (
      <div className="mx-auto my-10 max-w-lg rounded-xl border border-white/10 bg-[#111] p-6 text-center">
        <h2 className="text-lg font-semibold text-white">Something broke on this page</h2>
        <p className="mt-2 text-sm text-white/60">
          {sanitizeMessage(error.message) || "Unexpected client error."}
        </p>
        <button
          onClick={this.reset}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-black transition hover:brightness-110"
        >
          Try again
        </button>
      </div>
    );
  }
}

/** Trim provider/internal noise from an Error message before showing it to a user. */
export function sanitizeMessage(msg: string | undefined | null): string {
  if (!msg) return "";
  const s = String(msg).trim();
  if (s.length > 240) return s.slice(0, 237) + "…";
  return s;
}
