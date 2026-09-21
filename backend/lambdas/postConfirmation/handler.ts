import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? "ap-south-1",
});

/**
 * Self-service registration is candidate-only.  A candidate receives a private
 * tenant after confirming their email; privileged tenant membership is created
 * exclusively by the admin invitation handler.
 */
export const main: PostConfirmationTriggerHandler = async (event) => {
  const userPoolId = event.userPoolId;
  const username = event.userName;
  const subject = event.request.userAttributes.sub?.trim();
  const existingTenantId = event.request.userAttributes["custom:tenantId"]?.trim();

  if (!userPoolId || !username || !subject) {
    throw new Error("Post-confirmation event is missing user identity details");
  }

  // Invitations already contain their organization tenant. Never replace it.
  if (existingTenantId) {
    return event;
  }

  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: [
        {
          Name: "custom:tenantId",
          Value: `candidate-${subject}`,
        },
      ],
    })
  );

  return event;
};
