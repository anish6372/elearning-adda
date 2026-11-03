import { Skeleton } from "@/components/ui/skeleton";
import { initialSignInFormData, initialSignUpFormData } from "@/config";
import {
  checkAuthService,
  logoutService,
  loginService,
  registerService,
  googleAuthService,
  validate2FAService,
  setup2FAService,
  verifyEnable2FAService,
  disable2FAService,
} from "@/services";
import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [signInFormData, setSignInFormData] = useState(initialSignInFormData);
  const [signUpFormData, setSignUpFormData] = useState(initialSignUpFormData);
  const [auth, setAuth] = useState({
    authenticate: false,
    user: null,
  });
  const [loading, setLoading] = useState(true);
  const [pending2FA, setPending2FA] = useState({
    isPending: false,
    userId: null,
  });

  async function handleRegisterUser(event) {
    if (event && event.preventDefault) event.preventDefault();
    const data = await registerService(signUpFormData);
    return data;
  }

  async function handleLoginUser(event) {
    if (event && event.preventDefault) event.preventDefault();
    const data = await loginService(signInFormData);

    if (data.success) {
      if (data.require2FA) {
        setPending2FA({
          isPending: true,
          userId: data.userId,
        });
        return data;
      }

      sessionStorage.setItem(
        "accessToken",
        JSON.stringify(data.data.accessToken)
      );
      setAuth({
        authenticate: true,
        user: data.data.user,
      });
    } else {
      setAuth({
        authenticate: false,
        user: null,
      });
    }
    return data;
  }

  async function handleGoogleLogin(credential) {
    try {
      const data = await googleAuthService(credential);
      if (data.success) {
        if (data.require2FA) {
          setPending2FA({
            isPending: true,
            userId: data.userId,
          });
          return data;
        }

        sessionStorage.setItem(
          "accessToken",
          JSON.stringify(data.data.accessToken)
        );
        setAuth({
          authenticate: true,
          user: data.data.user,
        });
      }
      return data;
    } catch (error) {
      console.error("Google Login Error:", error);
      return { success: false, message: "Google Login failed" };
    }
  }

  async function handle2FAValidation(token) {
    try {
      const data = await validate2FAService(pending2FA.userId, token);
      if (data.success) {
        sessionStorage.setItem(
          "accessToken",
          JSON.stringify(data.data.accessToken)
        );
        setAuth({
          authenticate: true,
          user: data.data.user,
        });
        setPending2FA({
          isPending: false,
          userId: null,
        });
      }
      return data;
    } catch (error) {
      console.error("2FA Validation Error:", error);
      return { success: false, message: error.response?.data?.message || "Invalid 2FA code" };
    }
  }

  async function setup2FA() {
    return await setup2FAService();
  }

  async function verify2FA(token) {
    const data = await verifyEnable2FAService(token);
    if (data.success && data.user) {
      setAuth((prev) => ({
        ...prev,
        user: { ...prev.user, isTwoFactorEnabled: true },
      }));
    }
    return data;
  }

  async function disable2FA() {
    const data = await disable2FAService();
    if (data.success && data.user) {
      setAuth((prev) => ({
        ...prev,
        user: { ...prev.user, isTwoFactorEnabled: false },
      }));
    }
    return data;
  }

  //check auth user
  async function checkAuthUser() {
    try {
      const data = await checkAuthService();
      if (data.success) {
        setAuth({
          authenticate: true,
          user: data.data.user,
        });
        setLoading(false);
      } else {
        setAuth({
          authenticate: false,
          user: null,
        });
        setLoading(false);
      }
    } catch (error) {
      console.log(error);
      if (!error?.response?.data?.success) {
        setAuth({
          authenticate: false,
          user: null,
        });
        setLoading(false);
      }
    }
  }

  function resetCredentials() {
    logoutService();
    sessionStorage.removeItem("accessToken");
    setAuth({
      authenticate: false,
      user: null,
    });
    setPending2FA({
      isPending: false,
      userId: null,
    });
  }

  useEffect(() => {
    checkAuthUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        signInFormData,
        setSignInFormData,
        signUpFormData,
        setSignUpFormData,
        handleRegisterUser,
        handleLoginUser,
        handleGoogleLogin,
        handle2FAValidation,
        pending2FA,
        setPending2FA,
        setup2FA,
        verify2FA,
        disable2FA,
        auth,
        resetCredentials,
      }}
    >
      {loading ? <Skeleton /> : children}
    </AuthContext.Provider>
  );
}

