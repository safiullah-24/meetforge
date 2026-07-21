import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getLinkClass = ({ isActive }) =>
  [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
  ].join(' ');

export default function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink to="/" className="text-lg font-bold text-slate-100">
          MeetForge
        </NavLink>

        <div className="flex flex-wrap items-center gap-2">
          {!isAuthenticated && (
            <>
              <NavLink to="/" className={getLinkClass}>
                Home
              </NavLink>
              <NavLink to="/login" className={getLinkClass}>
                Login
              </NavLink>
              <NavLink to="/signup" className={getLinkClass}>
                Signup
              </NavLink>
            </>
          )}

          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" className={getLinkClass}>
                Dashboard
              </NavLink>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
