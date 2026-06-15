import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { withAuth } from "../../shared/middlewares/with-auth.js";

async function handler(
  _event: APIGatewayProxyEventV2,
  auth: { sub: string; email?: string; role: string; tenantId: string }
): Promise<APIGatewayProxyStructuredResultV2> {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: "Recruiter dashboard authorized",
      user: {
        sub: auth.sub,
        email: auth.email,
        role: auth.role,
        tenantId: auth.tenantId,
      },
    }),
  };
}

export const main = withAuth(handler, ["recruiter", "admin"]);
