import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] flex items-center justify-center p-4">
                    <div className="max-w-md w-full glass-card p-8 rounded-2xl text-center">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">
                            Oops! Something went wrong
                        </h1>

                        <p className="text-gray-400 mb-6">
                            We encountered an unexpected error. Don't worry, our team has been notified.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400 mb-2">
                                    Error Details (Dev Only)
                                </summary>
                                <div className="bg-[#1a1a1a] p-4 rounded-lg text-xs font-mono text-red-400 overflow-auto max-h-48">
                                    <div className="mb-2">
                                        <strong>Error:</strong> {this.state.error.toString()}
                                    </div>
                                    {this.state.errorInfo && (
                                        <div>
                                            <strong>Stack Trace:</strong>
                                            <pre className="mt-1 whitespace-pre-wrap">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={this.handleReload}
                                className="flex-1 bg-primary hover:bg-primary/90"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reload Page
                            </Button>
                            <Button
                                onClick={this.handleGoHome}
                                variant="outline"
                                className="flex-1 border-gray-700 text-white hover:bg-gray-900"
                            >
                                <Home className="mr-2 h-4 w-4" />
                                Go Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
