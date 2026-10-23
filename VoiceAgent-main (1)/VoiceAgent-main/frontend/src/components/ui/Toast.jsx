import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast = ({ type, message, onClose, id }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 200); // Wait for fade out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-secondary text-white border border-secondary/20';
      case 'error':
        return 'bg-error text-white border border-error/20';
      case 'info':
        return 'bg-primary text-white border border-primary/20';
      default:
        return 'bg-primary text-white border border-primary/20';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5" />;
      default:
        return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  return (
    <div
      className={`${getToastStyles()} fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-200 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 200);
          }}
          className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
          aria-label="Close toast"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message) => addToast('success', message), [addToast]);
  const showError = useCallback((message) => addToast('error', message), [addToast]);
  const showInfo = useCallback((message) => addToast('info', message), [addToast]);
  
  // Generic showToast function for backward compatibility
  const showToast = useCallback((message, type = 'info') => {
    addToast(type, message);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showToast }}>
      {children}
      <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
