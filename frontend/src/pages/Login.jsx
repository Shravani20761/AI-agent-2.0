import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

const Login = () => {
  const [email, setEmail] = useState('admin@seagull.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { showToast, showSuccess, showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        showSuccess('Welcome back!');
        navigate('/admin');
      } else {
        showError(result.error || 'Sign in failed.');
      }
    } catch (error) {
      showError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant p-8 rounded-2xl shadow-sm">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#0050cb" />
              <path d="M12 20V24M16 16V28M20 12V32M24 16V28M28 20V24" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-display-lg text-headline-lg font-black text-on-surface">
            VoiceCRM
          </h1>
          <p className="text-label-md text-on-surface-variant font-bold uppercase tracking-widest mt-1">
            AI Voice Automation
          </p>
        </div>

        {/* Input Fields */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-on-surface-variant text-label-md font-bold uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-on-surface placeholder-outline focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="admin@voicecrm.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-on-surface-variant text-label-md font-bold uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-on-surface placeholder-outline focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-primary text-white font-bold rounded-xl hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-on-surface-variant text-label-md">
            Demo Credentials: <span className="font-mono bg-surface-container px-1.5 py-0.5 rounded text-primary">admin@seagull.com</span> / <span className="font-mono bg-surface-container px-1.5 py-0.5 rounded text-primary">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
