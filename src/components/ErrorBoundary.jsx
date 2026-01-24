import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AnimatedButton } from './ui/AnimatedButton';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-beatwap-black flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertCircle size={32} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Ops! Algo deu errado.</h2>
            <p className="text-gray-400 mb-6">
              Desculpe, encontramos um erro inesperado. Tente recarregar a página.
            </p>

            {this.state.error && (
              <div className="bg-black/30 p-4 rounded-lg mb-6 text-left overflow-auto max-h-40">
                <code className="text-xs text-red-400 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <AnimatedButton 
              onClick={this.handleReset}
              fullWidth
              variant="primary"
            >
              <RefreshCw size={18} />
              Recarregar Página
            </AnimatedButton>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-4 text-sm text-gray-500 hover:text-white transition-colors"
            >
              Voltar para o início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
