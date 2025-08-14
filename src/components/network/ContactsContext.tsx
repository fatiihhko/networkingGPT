import { createContext, useContext, useMemo, useState, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "./types";

interface ContactsContextValue {
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
  isLoading: boolean;
  refreshContacts: () => Promise<void>;
}

const ContactsContext = createContext<ContactsContextValue | undefined>(undefined);

export const ContactsProvider = ({ children }: { children: ReactNode }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  const refreshContacts = useCallback(async () => {
    if (isLoading && hasInitialized) return; // Prevent duplicate calls
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setContacts(data as Contact[]);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setIsLoading(false);
      setHasInitialized(true);
    }
  }, [isLoading, hasInitialized]);

  useEffect(() => {
    if (!hasInitialized) {
      refreshContacts();
    }

    // Listen for contact refresh events
    const handleContactsRefresh = (event: CustomEvent) => {
      if (event.detail) {
        setContacts(event.detail);
      } else {
        refreshContacts();
      }
    };

    window.addEventListener('contacts:refresh', handleContactsRefresh as EventListener);
    
    return () => {
      window.removeEventListener('contacts:refresh', handleContactsRefresh as EventListener);
    };
  }, [refreshContacts, hasInitialized]);

  const value = useMemo(() => ({ 
    contacts, 
    setContacts, 
    isLoading,
    refreshContacts 
  }), [contacts, isLoading, refreshContacts]);

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
};

export const useContacts = () => {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error("useContacts must be used within ContactsProvider");
  return ctx;
};
