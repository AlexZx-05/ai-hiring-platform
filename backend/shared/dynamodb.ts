import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION ?? "ap-south-1";

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

export const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  }
);

export function requireTableName(): string {
  if (!TABLE_NAME) {
    throw new Error("DYNAMODB_TABLE_NAME is not configured");
  }

  return TABLE_NAME;
}
