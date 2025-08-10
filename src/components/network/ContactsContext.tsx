import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import type { Contact } from "./types";

interface ContactsContextValue {
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
}

const ContactsContext = createContext<ContactsContextValue | undefined>(undefined);

export const ContactsProvider = ({ children }: { children: ReactNode }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);

  const value = useMemo(() => ({ contacts, setContacts }), [contacts]);

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
};

export const useContacts = () => {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error("useContacts must be used within ContactsProvider");
  return ctx;
};
