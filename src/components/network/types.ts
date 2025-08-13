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
  // New fields for premium network visualization
  avatar_url?: string | null;
  handle?: string | null;
  category?: "work" | "family" | "friend" | "other";
  created_at?: string;
  updated_at?: string;
};

// Enhanced types for network visualization
export type Person = {
  id: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  role?: string;
  city?: string;
  category?: "work" | "family" | "friend" | "other";
  closeness?: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  // Backward compatibility with existing Contact fields
  first_name?: string;
  last_name?: string;
  profession?: string;
  relationship_degree?: number;
  services?: string[];
  tags?: string[];
  phone?: string;
  email?: string;
  description?: string;
  parent_contact_id?: string;
};

export type Link = {
  id: string;
  source: string;
  target: string;
  strength?: number;
  // Backward compatibility
  relationship_degree?: number;
};

export type NetworkFilters = {
  categories: ("work" | "family" | "friend" | "other")[];
  closenessRange: [number, number];
  searchTerm: string;
};

export type NetworkState = {
  people: Person[];
  links: Link[];
  selectedPersonId: string | null;
  filters: NetworkFilters;
  timelineDate: string | null;
  mode2d3d: "2d" | "3d";
  focusMode: boolean;
};
