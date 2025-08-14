import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card className="modern-card p-8 text-center max-w-md mx-auto">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Bir şeyler ters gitti</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
              </p>
              {this.state.error && (
                <details className="text-xs text-muted-foreground bg-muted p-2 rounded mb-4">
                  <summary className="cursor-pointer">Hata detayları</summary>
                  <pre className="mt-2 whitespace-pre-wrap">{this.state.error.message}</pre>
                </details>
              )}
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              className="btn-modern hover-lift"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Sayfayı Yenile
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}