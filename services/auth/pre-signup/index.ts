import { CognitoUserPoolTriggerEvent } from 'aws-lambda';

export const handler = async (event: CognitoUserPoolTriggerEvent) => {
  console.log('PreSignUp event:', JSON.stringify(event));

  // Auto-confirm email-based signups
  event.response.autoConfirmUser = true;
  event.response.autoVerifiedAttributes = ['email'];

  return event;
};
