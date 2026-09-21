import axios from "axios";

const region =
  process.env.NEXT_PUBLIC_AWS_REGION ??
  process.env.NEXT_PUBLIC_COGNITO_REGION ??
  "ap-south-1";
const apiGatewayId = process.env.NEXT_PUBLIC_API_GATEWAY_ID;
const apiStage = process.env.NEXT_PUBLIC_API_STAGE ?? "dev";
const computedBaseUrl = apiGatewayId
  ? `https://${apiGatewayId}.execute-api.${region}.amazonaws.com/${apiStage}`
  : undefined;

export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    computedBaseUrl ??
    "http://localhost:4000",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token =
      // REST API Gateway validates ID tokens when no OAuth scope is attached
      // to the route. The backend resolves tenant membership from Cognito if
      // an older token does not include the custom tenant attribute.
      localStorage.getItem("auth_id_token") ??
      localStorage.getItem("auth_access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
