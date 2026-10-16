import React, { createContext, useContext } from 'react';
import { useInbox } from './useInbox';

type InboxApi = ReturnType<typeof useInbox>;

const InboxContext = createContext<InboxApi | null>(null);

export function InboxProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const inbox = useInbox();
  return <InboxContext.Provider value={inbox}>{children}</InboxContext.Provider>;
}

export function useInboxContext(): InboxApi {
  const value = useContext(InboxContext);
  if (!value) {
    throw new Error('useInboxContext must be used within InboxProvider');
  }
  return value;
}
