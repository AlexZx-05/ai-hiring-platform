import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export function json(
  statusCode: number,
  body: unknown
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export function parseJsonBody<T>(event: APIGatewayProxyEventV2): T {
  if (!event.body) {
    throw new Error("Missing request body");
  }

  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export function getPathParam(
  event: APIGatewayProxyEventV2,
  key: string
): string | undefined {
  const value = event.pathParameters?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getHttpMethod(event: APIGatewayProxyEventV2): string {
  return (
    event.requestContext.http?.method ??
    (event as APIGatewayProxyEventV2 & { httpMethod?: string }).httpMethod ??
    "GET"
  ).toUpperCase();
}

export function getRawPath(event: APIGatewayProxyEventV2): string {
  return (
    event.rawPath ??
    (event as APIGatewayProxyEventV2 & { path?: string }).path ??
    ""
  );
}
