import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { authorizeRole, verifyAccessToken } from "./auth-middleware.js";
import type { AppRole, AuthContext } from "../types/auth.js";

type ProtectedHandler = (
  event: APIGatewayProxyEventV2,
  auth: AuthContext
) => Promise<APIGatewayProxyStructuredResultV2>;

function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function withAuth(handler: ProtectedHandler, allowedRoles: AppRole[]) {
  return async (
    event: APIGatewayProxyEventV2
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
      const auth = await verifyAccessToken(event);
      authorizeRole(auth, allowedRoles);
      return handler(event, auth);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      if (message === "Forbidden") {
        return json(403, { message: "Forbidden" });
      }
      return json(401, { message: "Unauthorized" });
    }
  };
}
