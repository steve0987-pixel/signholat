import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unexpected runtime error"
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("UI crash caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", fontFamily: "Segoe UI, sans-serif", color: "#132238" }}>
          <h1 style={{ marginBottom: "8px" }}>App failed to render</h1>
          <p style={{ marginBottom: "8px" }}>Open browser console to inspect details.</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f7f9fc", padding: "12px", borderRadius: "8px" }}>
            {this.state.errorMessage}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
