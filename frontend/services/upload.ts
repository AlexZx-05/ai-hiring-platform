import { api } from "./api";

export type PresignUploadInput = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type PresignUploadResponse = {
  uploadUrl: string;
  objectKey: string;
  resumeId: string;
  expiresIn: number;
  maxFileSizeBytes: number;
};

export async function requestResumeUploadUrl(
  payload: PresignUploadInput
): Promise<PresignUploadResponse> {
  const accessToken =
    typeof window !== "undefined"
      ? localStorage.getItem("auth_access_token")
      : null;
  if (!accessToken) {
    throw new Error("Your sign-in session has expired. Please sign in again.");
  }

  const response = await api.post<PresignUploadResponse>("/upload/url", payload, {
    // API Gateway validates the ID token in Authorization. The upload Lambda
    // uses GetUser, which requires the matching Cognito access token.
    headers: { "X-Cognito-Access-Token": accessToken },
  });
  return response.data;
}

export async function uploadResumeToS3(
  uploadUrl: string,
  file: File
): Promise<void> {
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload resume to S3");
  }
}
