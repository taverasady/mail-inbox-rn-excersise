import type { Email } from '../types/email';

export type RootStackParamList = {
  Inbox: undefined;
  Message: { email: Email };
};
