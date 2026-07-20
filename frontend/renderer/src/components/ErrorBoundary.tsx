import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Mettre à jour l'état pour que le prochain rendu affiche l'interface de secours
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div style={{ 
          padding: "20px", 
          backgroundColor: "#f8d7da", 
          color: "#721c24",
          borderRadius: "5px", 
          margin: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h2>Une erreur est survenue</h2>
          <p>Veuillez essayer de rafraîchir la page.</p>
          <details style={{ marginTop: "15px", cursor: "pointer" }}>
            <summary>Détails de l'erreur</summary>
            <pre style={{ 
              whiteSpace: "pre-wrap", 
              backgroundColor: "#f1f1f1", 
              padding: "10px",
              borderRadius: "5px",
              marginTop: "10px"
            }}>{this.state.error?.toString()}</pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "15px"
            }}
          >
            Rafraîchir la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;