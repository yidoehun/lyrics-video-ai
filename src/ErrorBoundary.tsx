import { Component, ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : "알 수 없는 렌더링 오류";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled render error:", error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="container">
          <section className="card">
            <h1>앱을 표시할 수 없습니다</h1>
            <p>초기 렌더링 중 오류가 발생했습니다.</p>
            {this.state.message ? <p className="error">{this.state.message}</p> : null}
            <button type="button" onClick={this.handleReload}>
              새로고침
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
