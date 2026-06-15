"use client";

import { Amplify } from "aws-amplify";

let configured = false;

export function configureAmplifyAuth() {
  if (configured) {
    return;
  }

  const userPoolId =
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "ap-south-1_qaHo29dGX";
  const userPoolClientId =
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "67t6ib5en6cdis6cvi8dk1ub7l";

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        signUpVerificationMethod: "code",
      },
    },
  });

  configured = true;
}
