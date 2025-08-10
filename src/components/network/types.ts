export type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  city: string | null;
  profession: string | null;
  relationship_degree: number;
  services: string[];
  tags: string[];
  phone: string | null;
  email: string | null;
  description: string | null;
  parent_contact_id: string | null;
};
