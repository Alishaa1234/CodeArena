import axiosClient from "./axiosClient";

// Since interview backend is now merged into LeetCode backend,
// interviewClient is just a re-export of axiosClient with the same cookie auth.
// All /api/interview/* routes use the same JWT cookie as the rest of the app.

export default axiosClient;