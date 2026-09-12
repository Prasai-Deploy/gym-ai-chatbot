import axios, { AxiosRequestConfig } from "axios";
import { supabase } from "../lib/supabase";

interface HttpClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  put<T = any>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  patch<T = any>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const axiosClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Automatically inject Supabase JWT
axiosClient.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Global error handling
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    const responseBody = error.response?.data;
    const message =
      responseBody?.message ||
      responseBody?.error ||
      error.message ||
      "An unexpected error occurred";

    if (status === 401) {
      // Clear session or redirect to login
      await supabase.auth.signOut();
      window.location.href = "/login";
    }

    if (
      status === 403 &&
      [
        "Access denied by administrator",
        "Membership required",
        "Inactive member",
      ].includes(message)
    ) {
      window.location.assign("/membership-required");
    }

    return Promise.reject(new ApiRequestError(message, status, responseBody));
  },
);

// Axios response interceptors return the JSON body, so expose that actual
// contract instead of the library's default AxiosResponse type.
export const httpClient = axiosClient as unknown as HttpClient;
