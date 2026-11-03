import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AuthProvider from "./context/auth-context/index.jsx";
import InstructorProvider from "./context/instructor-context/index.jsx";
import StudentProvider from "./context/student-context/index.jsx";
import SocketProvider from "./context/socket-context/index.jsx";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "mock-client-id";

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <InstructorProvider>
            <StudentProvider>
              <App />
            </StudentProvider>
          </InstructorProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>
);

