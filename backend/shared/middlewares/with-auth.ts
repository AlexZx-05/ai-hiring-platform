import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import {
  authorizeRole,
  verifyAccessToken,
} from "./auth-middleware.js";

import type {
  AppRole,
  AuthContext,
} from "../types/auth.js";

type ProtectedHandler = (
  event: APIGatewayProxyEventV2,
  auth: AuthContext
) => Promise<APIGatewayProxyStructuredResultV2>;

function json(
  statusCode: number,
  body: unknown
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export function withAuth(
  handler: ProtectedHandler,
  allowedRoles: AppRole[]
) {
  return async (
    event: APIGatewayProxyEventV2
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    let auth: AuthContext;
    try {
      auth = await verifyAccessToken(event);
      authorizeRole(auth, allowedRoles);
    } catch (error) {
      console.warn("Request authentication failed", {
        route: event.rawPath,
        method: event.requestContext.http?.method,
      });
      const message =
        error instanceof Error
          ? error.message
          : "Unknown authentication error";
      if (message === "Forbidden") {
        return json(403, { message: "Forbidden" });
      }
      return json(401, { message: "Unauthorized" });
    }

    try {
      return await handler(event, auth);
    } catch (error) {
      console.error("Authenticated request handler failed", {
        route: event.rawPath,
        method: event.requestContext.http?.method,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        requestId: event.requestContext.requestId,
      });
      return json(500, {
        message: "The server could not complete this request. Please try again.",
      });
    }
  };
}
