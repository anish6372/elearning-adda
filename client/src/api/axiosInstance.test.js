import axios from "axios";
import axiosInstance from "./axiosInstance";

// The refresh call uses the bare axios instance, so it is mocked separately from the API adapter
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal();
  actual.default.post = vi.fn();
  return actual;
});

// Fake adapter: protected route fails with 401 until the request carries the refreshed token
const adapter = vi.fn(async (config) => {
  if (config.headers.Authorization !== "Bearer fresh-token") {
    const error = new Error("401");
    error.config = config;
    error.response = { status: 401, data: {}, config };
    throw error;
  }
  return { status: 200, data: { ok: true }, headers: {}, config };
});

describe("axiosInstance refresh interceptor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem("accessToken", JSON.stringify("expired-token"));
    axiosInstance.defaults.adapter = adapter;
  });

  it("refreshes once and retries every request that got a 401", async () => {
    axios.post.mockResolvedValue({ data: { data: { accessToken: "fresh-token" } } });

    const results = await Promise.all([axiosInstance.get("/student/a"), axiosInstance.get("/student/b")]);

    expect(results.map((r) => r.data.ok)).toEqual([true, true]);
    expect(axios.post).toHaveBeenCalledTimes(1); // concurrent 401s share one refresh
    expect(JSON.parse(sessionStorage.getItem("accessToken"))).toBe("fresh-token");
  });

  it("clears the session when the refresh token is rejected", async () => {
    axios.post.mockRejectedValue(new Error("refresh failed"));

    await expect(axiosInstance.get("/student/a")).rejects.toThrow();
    expect(sessionStorage.getItem("accessToken")).toBeNull();
  });

  it("does not try to refresh after a failed login", async () => {
    await expect(axiosInstance.post("/auth/login", {})).rejects.toThrow();
    expect(axios.post).not.toHaveBeenCalled();
  });
});
