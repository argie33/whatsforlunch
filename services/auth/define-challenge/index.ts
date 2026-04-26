import { CognitoUserPoolTriggerEvent } from 'aws-lambda';

export const handler = async (event: CognitoUserPoolTriggerEvent) => {
  console.log('DefineAuthChallenge event:', JSON.stringify(event));

  // If this is the first attempt, always return CUSTOM_CHALLENGE
  if (!event.request.session || event.request.session.length === 0) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    return event;
  }

  // Check if the previous challenge was answered
  const lastChallenge = event.request.session[event.request.session.length - 1];
  if (lastChallenge.challengeName === 'CUSTOM_CHALLENGE' && lastChallenge.challengeResult === true) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  // Challenge failed or not answered
  event.response.issueTokens = false;
  event.response.failAuthentication = true;
  return event;
};
