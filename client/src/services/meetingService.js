import { getApiBaseUrl } from './authService';

const API_BASE_URL = getApiBaseUrl();

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
    throw new Error(data?.message || 'Request failed. Please try again.');
  }

  return data;
};

const request = async (path, method, token, body) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse(response);
};

export const createMeeting = (token, payload) => request('/api/meetings', 'POST', token, payload);
export const joinMeeting = (token, payload) => request('/api/meetings/join', 'POST', token, payload);
export const getMyMeetings = (token) => request('/api/meetings/my', 'GET', token);