import { Component } from "react";

// React Error Boundary — catches render/runtime errors in the tree below so a
// crash in one view (e.g. a transfer render bug) doesn't blank the whole app.
// It shows a friendly "reload" screen instead of a white page or console-grey
// failure, which matters in production where there's no dev overlay.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Best-effort log so production errors are discoverable in the console/Render logs.
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
            background: "#050d1f",
            color: "#edf5ff",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ maxWidth: 420, color: "#9aa9c6", lineHeight: 1.5 }}>
            An unexpected error occurred. Reloading the app usually fixes it — your transfers and history will not be
            lost.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "10px 22px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              color: "#050d1f",
              background: "linear-gradient(135deg, #7bd7ff, #a78bfa)",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

