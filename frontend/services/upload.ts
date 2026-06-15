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
  const response = await api.post<PresignUploadResponse>("/upload/url", payload);
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
