import { randomUUID } from "node:crypto";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAuth } from "../../shared/middlewares/with-auth.js";
import type { AuthContext } from "../../shared/types/auth.js";

const REGION = process.env.AWS_REGION ?? "ap-south-1";
const RESUME_BUCKET_NAME = process.env.RESUME_BUCKET_NAME;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_EXPIRY_SECONDS = 300;
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
]);

const s3Client = new S3Client({ region: REGION });

type UploadRequest = {
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
};

function json(
  statusCode: number,
  body: unknown
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function normalizeFileName(rawName: string): string {
  return rawName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function parseBody(event: APIGatewayProxyEventV2): UploadRequest {
  if (!event.body) {
    throw new Error("Missing request body");
  }
  try {
    return JSON.parse(event.body) as UploadRequest;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function validateRequest(payload: UploadRequest): {
  fileName: string;
  contentType: string;
  sizeBytes: number;
} {
  const fileName = payload.fileName?.trim() ?? "";
  const contentType = payload.contentType?.trim() ?? "";
  const sizeBytes = Number(payload.sizeBytes);

  if (!fileName) {
    throw new Error("fileName is required");
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error("Only PDF files are supported");
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("sizeBytes must be a positive number");
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds maximum size of 5MB");
  }

  return {
    fileName: normalizeFileName(fileName),
    contentType,
    sizeBytes,
  };
}

async function handler(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  if (!RESUME_BUCKET_NAME) {
    return json(500, { message: "RESUME_BUCKET_NAME is not configured" });
  }

  let payload: UploadRequest;
  try {
    payload = parseBody(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bad request";
    return json(400, { message });
  }

  let validPayload: ReturnType<typeof validateRequest>;
  try {
    validPayload = validateRequest(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return json(400, { message });
  }

  const resumeId = randomUUID();
  const objectKey = `tenant/${auth.tenantId}/candidate/${auth.sub}/resume/${resumeId}-${validPayload.fileName}`;

  const command = new PutObjectCommand({
    Bucket: RESUME_BUCKET_NAME,
    Key: objectKey,
    ContentType: validPayload.contentType,
    Metadata: {
      tenantid: auth.tenantId,
      candidateid: auth.sub,
      resumeid: resumeId,
      scanstatus: "pending",
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  });

  return json(200, {
    uploadUrl,
    objectKey,
    resumeId,
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    malwareScan: {
      status: "PENDING_HOOK",
      message: "Malware scan hook placeholder is enabled for Week 2.",
    },
  });
}

export const main = withAuth(handler, ["candidate", "admin"]);
