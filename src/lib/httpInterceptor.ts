import axios from 'axios';

// ─── 1. Axios Response Interceptor ──────────────────────────────────────────
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.response?.data?.error;

    if (
      message === "Access denied by administrator" ||
      message === "Membership required" ||
      message === "Inactive member"
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
          message === "Inactive member"
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
