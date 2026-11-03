import axiosInstance, { API_BASE_URL } from "@/api/axiosInstance";
import { AuthContext } from "@/context/auth-context";
import { toast } from "@/hooks/use-toast";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext(null);

function readToken() {
  try {
    return JSON.parse(sessionStorage.getItem("accessToken")) || "";
  } catch {
    return "";
  }
}

// One authenticated socket per logged-in user, shared by every page
export default function SocketProvider({ children }) {
  const { auth } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!auth?.authenticate) return undefined;

    const instance = io(API_BASE_URL, {
      // A function, so every reconnect sends the latest (possibly refreshed) access token
      auth: (cb) => cb({ token: readToken() }),
      withCredentials: true,
    });

    let retriedAfterRefresh = false;
    instance.on("connect", () => {
      retriedAfterRefresh = false;
    });
    instance.on("connect_error", async (err) => {
      if (err.message !== "unauthorized" || retriedAfterRefresh) return;
      retriedAfterRefresh = true;
      try {
        // Any authenticated call refreshes an expired access token through the axios interceptor
        await axiosInstance.get("/auth/check-auth");
        instance.connect();
      } catch {
        // still logged out; leave the socket disconnected
      }
    });

    instance.on("notification", (payload) => {
      toast({ title: "Notification", description: payload?.message });
    });

    setSocket(instance);
    return () => {
      instance.disconnect();
      setSocket(null);
    };
  }, [auth?.authenticate, auth?.user?._id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
