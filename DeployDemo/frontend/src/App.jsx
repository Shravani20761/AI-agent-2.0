import { useEffect, useState } from 'react';

export default function App() {
  const [message, setMessage] = useState('Loading...');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/message')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setError('Could not reach backend'));
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>DeployDemo</h1>
        <p style={styles.label}>Message from backend:</p>
        {error ? (
          <p style={styles.error}>{error}</p>
        ) : (
          <p style={styles.message}>{message}</p>
        )}
        <p style={styles.hint}>
          If you see the message above, your frontend and backend are both
          running and talking to each other inside Docker.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '40px 48px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#f8fafc',
    fontSize: '28px',
    marginBottom: '24px',
  },
  label: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '8px',
  },
  message: {
    color: '#4ade80',
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '24px',
  },
  error: {
    color: '#f87171',
    fontSize: '16px',
    marginBottom: '24px',
  },
  hint: {
    color: '#475569',
    fontSize: '13px',
    lineHeight: '1.6',
  },
};
