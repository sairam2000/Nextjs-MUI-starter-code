import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../services/api";
import TokenService from "../services/tokenService";

const cameraServiceBaseUrl = "https://prodserver.skylarklabs.ai";
const notificationServiceBaseUrl = "https://prodserver.skylarklabs.ai"; // [Todo] dont forgot to change notificationServiceBaseUrl in utils/webPush.js
const authServiceBaseUrl = "https://prodserver.skylarklabs.ai"; // [Todo] dont forgot to change baseURL in services/api.js

const AuthContext = createContext({});
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loading == true) {
      setUser(JSON.parse(localStorage.getItem("user")));
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    return new Promise((resolve, reject) => {
      api
        .post(`${authServiceBaseUrl}/auth/accounts/login/`, {
          email,
          password,
        })
        .then((response) => {
          console.log(response);
          if (response.data.access) {
            TokenService.setUser(response.data);
            window.location.pathname = "/";
          }
          resolve(response.data);
        })
        .catch((err) => {
          console.log(err.response);
          reject(err.response);
        });
    });
  };

  const register = async (data) => {
    console.log(data);
    const response = await api.post(
      `${authServiceBaseUrl}/auth/accounts/register/`,
      data
    );
    return response;
  };

  const request_forgot_password = (email) => {
    return api.post(
      `${authServiceBaseUrl}/auth/accounts/request-reset-email/`,
      { email }
    );
  };

  const verify_email = (token) => {
    return api.get(
      `${authServiceBaseUrl}/auth/accounts/email-verify/?token=${token}`
    );
  };

  const verify_reset_password = (token, uidb64) => {
    return api.get(
      `${authServiceBaseUrl}/auth/accounts/password-reset/${uidb64}/${token}/`
    );
  };

  const reset_password = (token, uidb64, body = {}) => {
    return api.patch(
      `${authServiceBaseUrl}/auth/accounts/password-reset-complete?uidb64=${uidb64}&token=${token}`,
      body
    );
  };

  const change_password = (body = {}) => {
    return api.post(
      `${authServiceBaseUrl}/auth/accounts/change-password/`,
      body
    );
  };

  const logout = () => {
    TokenService.removeUser();
    window.location.pathname = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verify_email,
        request_forgot_password,
        verify_reset_password,
        reset_password,
        change_password,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function ProtectRoute(Component) {
  console.log("protect route called");

  return () => {
    const { user, loading } = useAuth();
    useEffect(() => {
      if (loading) return;
      if (!user) window.location.pathname = "/login";
      console.log(user);
    }, [loading, user]);

    return <Component {...arguments} />;
  };
}

export default function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
