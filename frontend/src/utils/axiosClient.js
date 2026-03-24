import axios from "axios";

const axiosClient = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Global response interceptor — surfaces error messages cleanly
axiosClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong";
    return Promise.reject({ ...error, displayMessage: message });
  }
);

export default axiosClient;
