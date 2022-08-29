import axios from "axios";
import TokenService from "./tokenService";

const baseURL = "https://prodserver.skylarklabs.ai";
const loginEndpoint = "/auth/accounts/login/";
const refreshEndpoint = "/auth/token/refresh/";
const registerEndpoint = "/auth/accounts/register/";
const loginPagePath = "/login";

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const instance = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

instance.interceptors.request.use(
  (config) => {
    const token = TokenService.getLocalAccessToken();
    if (token) {
      config.headers["Authorization"] = "Bearer " + token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (res) => {
    return res;
  },
  async (err) => {
    const originalConfig = err.config;
    console.log(originalConfig.url);
    if (
      originalConfig.url !== loginEndpoint &&
      originalConfig.url !== registerEndpoint &&
      err.response
    ) {
      // Access Token was expired
      if (
        err.response.status === 401 &&
        originalConfig.url === refreshEndpoint
      ) {
        return Promise.reject(err);
      }
      if (err.response.status === 401 && !originalConfig._retry) {

        if (isRefreshing) {
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              console.log(originalConfig.url);
              originalConfig.headers["Authorization"] = "Bearer " + token;
              return instance(originalConfig);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalConfig._retry = true;
        isRefreshing = true;
        try {
          console.log("refreshing tokens");
          const rs = await instance.post(refreshEndpoint, {
            refresh: TokenService.getLocalRefreshToken(),
          });
          const { access } = rs.data;
          console.log(access);
          TokenService.updateLocalAccessToken(access);
          console.log(originalConfig);
          processQueue(null, access);
          return instance(originalConfig);
        } catch (_error) {
          console.log("error block");
          processQueue(_error, null);
          TokenService.removeUser();
          window.location.pathname = loginPagePath;
          return Promise.reject(_error);
        } finally{
          isRefreshing = false;
        }
      }
    }
    return Promise.reject(err);
  }
);
export default instance;
