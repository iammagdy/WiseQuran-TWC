import { Component, type ReactNode, type ErrorInfo } from "react";
import { isLazyChunkError } from "@/lib/lazy-with-retry";

interface Props {
  children: ReactNode;
  silent?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isChunkError: boolean;
}

const CHUNK_RELOAD_FLAG = "wise-error-boundary-chunk-reload";

export default class ErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  state: State = { hasError: false, error: null, retryCount: 0, isChunkError: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, isChunkError: isLazyChunkError(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crashed:", error, info.componentStack);

    // Chunk-load failures (after a deploy, or after an iOS PWA loaded
    // the app shell from a stale SW generation) won't be cured by a
    // re-render — only by re-fetching the new manifest. Try a single
    // hard reload, gated on a session flag so we never loop.
    if (this.state.isChunkError) {
      const alreadyReloaded =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "1";
      if (!alreadyReloaded && typeof window !== "undefined" && navigator.onLine) {
        try {
          sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
        } catch {
          /* ignore */
        }
        window.location.reload();
        return;
      }
    }

    if (this.state.retryCount < 2) {
      this.retryTimer = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1,
          isChunkError: false,
        }));
      }, 1000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  render() {
    if (this.state.hasError && this.state.retryCount >= 2) {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const headline = this.state.isChunkError
        ? isOffline
          ? "تعذّر تحميل هذا الجزء بدون إنترنت"
          : "تعذّر تحميل هذا الجزء من التطبيق"
        : "حدث خطأ غير متوقع";
      const subtext = this.state.isChunkError
        ? isOffline
          ? "يبدو أنك بدون اتصال وهذا الجزء لم يُحفظ بعد. اتصل بالإنترنت ثم أعد التحميل."
          : "حاول إعادة التحميل، وإذا استمرت المشكلة افتح التطبيق مرة واحدة وأنت متصل بالإنترنت."
        : "يرجى إعادة تحميل الصفحة للمتابعة";
      return (
        <div
          dir="rtl"
          className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground"
        >
          <div className="text-5xl">{this.state.isChunkError ? "📦" : "⚠️"}</div>
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold">{headline}</h1>
            <p className="text-sm text-muted-foreground">
              {subtext}
            </p>
          </div>
          {this.state.error && !this.state.isChunkError && (
            <pre className="text-xs text-destructive bg-destructive/10 rounded-lg p-4 max-w-sm overflow-auto text-start">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => {
              try {
                sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            إعادة التحميل
          </button>
        </div>
      );
    }

    if (this.state.hasError) return null;

    return this.props.children;
  }
}
