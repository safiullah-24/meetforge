const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const handleResponse = async (response) => {
  const data = await parseJsonSafely(response);

  if (!response.ok) {
    const message = data?.message || 'Request failed. Please try again.';
    throw new Error(message);
  }

  return data;
};

const request = async (path, body) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return handleResponse(response);
};

export const loginRequest = (payload) => request('/api/auth/login', payload);
export const registerRequest = (payload) => request('/api/auth/register', payload);

export const getApiBaseUrl = () => API_BASE_URL;
