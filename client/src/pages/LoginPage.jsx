import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authLoading, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const fromPath = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      await login({ email: email.trim(), password });
      navigate(fromPath, { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'Login failed.');
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-bold text-slate-100">Login</h1>
        <p className="mt-2 text-sm text-slate-300">Welcome back to MeetForge.</p>

        {errorMessage && (
          <p className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {errorMessage}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-200">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-500 transition focus:ring-2"
              placeholder="you@example.com"
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-rose-300">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-200">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-500 transition focus:ring-2"
              placeholder="Enter your password"
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-rose-300">{fieldErrors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full rounded-md bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-300">
          New to MeetForge?{' '}
          <Link to="/signup" className="font-medium text-cyan-400 hover:text-cyan-300">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
