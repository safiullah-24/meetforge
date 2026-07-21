import { createContext, useContext, useMemo, useState } from 'react';
import { loginRequest, registerRequest } from '../services/authService';

const AUTH_STORAGE_KEY = 'meetforge_auth';
const AuthContext = createContext(null);

const getStoredAuth = () => {
  const rawAuth = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawAuth) {
    return { user: null, token: null };
  }

  try {
    const parsedAuth = JSON.parse(rawAuth);
    return {
      user: parsedAuth?.user || null,
      token: parsedAuth?.token || null,
    };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return { user: null, token: null };
  }
};

export function AuthProvider({ children }) {
  const initialAuth = getStoredAuth();
  const [user, setUser] = useState(initialAuth.user);
  const [token, setToken] = useState(initialAuth.token);
  const [authLoading, setAuthLoading] = useState(false);

  const persistAuth = (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: nextUser,
        token: nextToken,
      })
    );
  };

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const login = async ({ email, password }) => {
    setAuthLoading(true);

    try {
      const response = await loginRequest({ email, password });
      persistAuth(response.user, response.token);
      return response;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async ({ name, email, password }) => {
    setAuthLoading(true);

    try {
      const response = await registerRequest({ name, email, password });
      persistAuth(response.user, response.token);
      return response;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      authLoading,
      login,
      register,
      logout,
    }),
    [user, token, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
