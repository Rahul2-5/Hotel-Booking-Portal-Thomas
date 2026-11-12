const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api')
  .replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, code, message, fieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the booking service. Please try again.');
  }

  if (response.status === 204) {
    return null;
  }

  // Preserve the backend's status, code, message and fieldErrors on failed requests.
  const data = await response.json().catch((error) => {
    if (error.name === 'AbortError') {
      throw error;
    }
    return null;
  });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.code || 'REQUEST_ERROR',
      data?.message || 'The request could not be completed. Please try again.',
      data?.fieldErrors || {},
    );
  }
  if (data === null) {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The service returned an unreadable response.');
  }
  return data;
}
