import axios from 'axios';

// ─── 1. Axios Response Interceptor ──────────────────────────────────────────
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (
      status === 401 ||
      status === 403 ||
      message === "Access denied by administrator" ||
      message === "Membership required" ||
      message === "Inactive member" ||
      message === "Unauthorized"
    ) {
      window.location.href = "/membership-required";
      return new Promise(() => {}); // Stop request chain
    }

    return Promise.reject(error);
  }
);

// ─── 2. Global Fetch Interceptor ─────────────────────────────────────────────
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  try {
    const response = await originalFetch(...args);

    // Redirect immediately for 401/403 HTTP status codes
    if (response.status === 401 || response.status === 403) {
      window.location.href = "/membership-required";
      return new Promise(() => {}); // Stop request chain
    }

    // Inspect json response body for authorization/membership error messages
    const clonedResponse = response.clone();
    try {
      const contentType = clonedResponse.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await clonedResponse.json();
        const message = data?.message || data?.error;
        
        if (
          message === "Access denied by administrator" ||
          message === "Membership required" ||
          message === "Inactive member" ||
          message === "Unauthorized"
        ) {
          window.location.href = "/membership-required";
          return new Promise(() => {}); // Stop request chain
        }
      }
    } catch {
      // Ignore reading or parsing errors
    }

    return response;
  } catch (error) {
    throw error;
  }
};
