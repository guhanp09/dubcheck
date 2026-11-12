import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/dm-sans";
import "./style.css";
import App from "./App";

class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal">
          <h1>The workspace could not be displayed.</h1>
          <p>
            Your saved browser data has not been cleared. Download it before
            reloading.
          </p>
          <button
            onClick={() => {
              const raw = localStorage.getItem("dubcheck.workspace.v1");
              if (raw) {
                const url = URL.createObjectURL(
                  new Blob([raw], { type: "application/json" }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "dubcheck-recovery.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }
            }}
          >
            Download recovery file
          </button>
          <button onClick={() => location.reload()}>Reload</button>
        </main>
      );
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
