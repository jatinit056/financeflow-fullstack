import axios from 'axios';

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";

/** Human-readable message for any error thrown by the API client. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const apiMessage = error.response?.data?.error?.message;
  if (apiMessage) return apiMessage;
  if (error.code === 'ECONNABORTED')
    return 'The server took too long to respond. Please try again.';
  if (error.request && !error.response) return NETWORK_MESSAGE;
  return fallback;
}

/** Map API validation details to { fieldName: message } for inline form errors. */
export function getFieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((fields, { field, message }) => {
    if (field && !fields[field]) fields[field] = message;
    return fields;
  }, {});
}

export const isCancelled = (error) => axios.isCancel(error);

/**
 * Blob requests (CSV export) return their JSON error body as a Blob — parse it so
 * getErrorMessage can read it like any other error.
 */
export async function normaliseBlobError(error) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      error.response.data = JSON.parse(await data.text());
    } catch {
      // not JSON — keep the original error
    }
  }
  return error;
}
