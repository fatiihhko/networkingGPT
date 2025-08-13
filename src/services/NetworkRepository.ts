import { supabase } from "@/integrations/supabase/client";
import type { Person, Link, Contact } from "@/components/network/types";

export interface NetworkRepository {
  getPeople(): Promise<Person[]>;
  getLinks(): Promise<Link[]>;
  addPerson(person: Omit<Person, 'id' | 'createdAt'>): Promise<Person>;
  updatePerson(id: string, updates: Partial<Person>): Promise<Person>;
  removePerson(id: string): Promise<void>;
  addLink(link: Omit<Link, 'id'>): Promise<Link>;
  removeLink(id: string): Promise<void>;
  seedNetwork(): Promise<void>;
}

// Utility functions for data transformation
const contactToPerson = (contact: Contact): Person => ({
  id: contact.id,
  name: `${contact.first_name} ${contact.last_name}`,
  handle: contact.handle || undefined,
  avatarUrl: contact.avatar_url || undefined,
  role: contact.profession || undefined,
  city: contact.city || undefined,
  category: contact.category || "other",
  closeness: Math.ceil((contact.relationship_degree || 5) / 2) as 1 | 2 | 3 | 4 | 5,
  createdAt: contact.created_at || new Date().toISOString(),
  // Backward compatibility
  first_name: contact.first_name,
  last_name: contact.last_name,
  profession: contact.profession,
  relationship_degree: contact.relationship_degree,
  services: contact.services,
  tags: contact.tags,
  phone: contact.phone,
  email: contact.email,
  description: contact.description,
  parent_contact_id: contact.parent_contact_id,
});

const personToContact = (person: Person): Omit<Contact, 'id'> => ({
  first_name: person.first_name || person.name.split(' ')[0] || '',
  last_name: person.last_name || person.name.split(' ').slice(1).join(' ') || '',
  city: person.city || null,
  profession: person.role || null,
  relationship_degree: (person.closeness || 3) * 2,
  services: person.services || [],
  tags: person.tags || [],
  phone: person.phone || null,
  email: person.email || null,
  description: person.description || null,
  parent_contact_id: person.parent_contact_id || null,
  avatar_url: person.avatarUrl || null,
  handle: person.handle || null,
  category: person.category || "other",
});

// Supabase implementation
export class SupabaseNetworkRepository implements NetworkRepository {
  async getPeople(): Promise<Person[]> {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching people:", error);
      return [];
    }

    return (data || []).map(contactToPerson);
  }

  async getLinks(): Promise<Link[]> {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, parent_contact_id, relationship_degree")
      .not("parent_contact_id", "is", null);

    if (error) {
      console.error("Error fetching links:", error);
      return [];
    }

    return (data || []).map(contact => ({
      id: `link-${contact.id}`,
      source: contact.parent_contact_id!,
      target: contact.id,
      strength: contact.relationship_degree / 10,
      relationship_degree: contact.relationship_degree,
    }));
  }

  async addPerson(person: Omit<Person, 'id' | 'createdAt'>): Promise<Person> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const contactData = personToContact(person as Person);
    
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        ...contactData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return contactToPerson(data);
  }

  async updatePerson(id: string, updates: Partial<Person>): Promise<Person> {
    const contactUpdates: Partial<Contact> = {};
    
    if (updates.name) {
      const [firstName, ...lastNameParts] = updates.name.split(' ');
      contactUpdates.first_name = firstName;
      contactUpdates.last_name = lastNameParts.join(' ') || '';
    }
    if (updates.role) contactUpdates.profession = updates.role;
    if (updates.city) contactUpdates.city = updates.city;
    if (updates.category) contactUpdates.category = updates.category;
    if (updates.closeness) contactUpdates.relationship_degree = updates.closeness * 2;
    if (updates.avatarUrl) contactUpdates.avatar_url = updates.avatarUrl;
    if (updates.handle) contactUpdates.handle = updates.handle;
    if (updates.services) contactUpdates.services = updates.services;
    if (updates.tags) contactUpdates.tags = updates.tags;
    if (updates.phone) contactUpdates.phone = updates.phone;
    if (updates.email) contactUpdates.email = updates.email;
    if (updates.description) contactUpdates.description = updates.description;

    const { data, error } = await supabase
      .from("contacts")
      .update(contactUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return contactToPerson(data);
  }

  async removePerson(id: string): Promise<void> {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async addLink(link: Omit<Link, 'id'>): Promise<Link> {
    // In Supabase, links are represented by parent_contact_id
    // We need to update the target contact to point to the source
    const { error } = await supabase
      .from("contacts")
      .update({ parent_contact_id: link.source })
      .eq("id", link.target);

    if (error) throw error;

    return {
      id: `link-${link.target}`,
      source: link.source,
      target: link.target,
      strength: link.strength || 0.5,
    };
  }

  async removeLink(id: string): Promise<void> {
    // Extract target contact ID from link ID
    const targetId = id.replace('link-', '');
    
    const { error } = await supabase
      .from("contacts")
      .update({ parent_contact_id: null })
      .eq("id", targetId);

    if (error) throw error;
  }

  async seedNetwork(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const seedPeople = [
      { name: "Eda Karaman", role: "UX Designer", category: "work" as const, closeness: 4 as const, city: "İstanbul" },
      { name: "Mert Aksoy", role: "Product Manager", category: "work" as const, closeness: 5 as const, city: "İstanbul" },
      { name: "Zeynep Arslan", role: "Data Analyst", category: "work" as const, closeness: 3 as const, city: "Ankara" },
      { name: "Can Demir", role: "iOS Developer", category: "work" as const, closeness: 4 as const, city: "İzmir" },
      { name: "Elif Yılmaz", role: "Recruiter", category: "work" as const, closeness: 3 as const, city: "İstanbul" },
      { name: "Kerem Kaya", role: "Frontend Developer", category: "work" as const, closeness: 5 as const, city: "İstanbul" },
      { name: "Ayşe Çetin", role: "HR Manager", category: "work" as const, closeness: 4 as const, city: "Ankara" },
      { name: "Emre Şahin", role: "Backend Developer", category: "work" as const, closeness: 4 as const, city: "İstanbul" },
      { name: "Derya Uçar", role: "QA Engineer", category: "work" as const, closeness: 3 as const, city: "İzmir" },
      { name: "Selin Aydın", role: "UX Researcher", category: "work" as const, closeness: 4 as const, city: "İstanbul" },
      { name: "Onur Kaplan", role: "Founder", category: "work" as const, closeness: 5 as const, city: "İstanbul" },
      { name: "İpek Güneş", role: "Advisor", category: "friend" as const, closeness: 4 as const, city: "İstanbul" },
      { name: "Burak Öz", role: "DevRel", category: "friend" as const, closeness: 3 as const, city: "Ankara" },
      { name: "Nazlı Güler", role: "Marketing Manager", category: "work" as const, closeness: 4 as const, city: "İstanbul" },
      { name: "Baran Tunç", role: "Legal Counsel", category: "work" as const, closeness: 3 as const, city: "İstanbul" },
    ];

    // Insert seed people
    for (const person of seedPeople) {
      await this.addPerson({
        ...person,
        email: `${person.name.toLowerCase().replace(' ', '.')}@example.com`,
        phone: `+90 5${Math.floor(Math.random() * 90000000) + 10000000}`,
        services: person.category === "work" ? ["Consulting", "Development"] : [],
        tags: person.category === "work" ? ["Tech", "Professional"] : ["Personal"],
      });
    }

    // Get all people to create links
    const people = await this.getPeople();
    
    // Create some hierarchical links
    const links = [
      { source: people[10].id, target: people[0].id }, // Founder -> UX Designer
      { source: people[10].id, target: people[1].id }, // Founder -> PM
      { source: people[10].id, target: people[5].id }, // Founder -> Frontend
      { source: people[10].id, target: people[7].id }, // Founder -> Backend
      { source: people[1].id, target: people[2].id },  // PM -> Data Analyst
      { source: people[1].id, target: people[4].id },  // PM -> Recruiter
      { source: people[5].id, target: people[8].id },  // Frontend -> QA
      { source: people[7].id, target: people[3].id },  // Backend -> iOS
      { source: people[4].id, target: people[6].id },  // Recruiter -> HR
      { source: people[0].id, target: people[9].id },  // UX Designer -> Researcher
    ];

    for (const link of links) {
      await this.addLink(link);
    }
  }
}

// Mock implementation for development/testing
export class MockNetworkRepository implements NetworkRepository {
  private people: Person[] = [];
  private links: Link[] = [];

  async getPeople(): Promise<Person[]> {
    return this.people;
  }

  async getLinks(): Promise<Link[]> {
    return this.links;
  }

  async addPerson(person: Omit<Person, 'id' | 'createdAt'>): Promise<Person> {
    const newPerson: Person = {
      ...person,
      id: `person-${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
    };
    this.people.push(newPerson);
    return newPerson;
  }

  async updatePerson(id: string, updates: Partial<Person>): Promise<Person> {
    const index = this.people.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Person not found");
    
    this.people[index] = { ...this.people[index], ...updates };
    return this.people[index];
  }

  async removePerson(id: string): Promise<void> {
    this.people = this.people.filter(p => p.id !== id);
    this.links = this.links.filter(l => l.source !== id && l.target !== id);
  }

  async addLink(link: Omit<Link, 'id'>): Promise<Link> {
    const newLink: Link = {
      ...link,
      id: `link-${Date.now()}-${Math.random()}`,
    };
    this.links.push(newLink);
    return newLink;
  }

  async removeLink(id: string): Promise<void> {
    this.links = this.links.filter(l => l.id !== id);
  }

  async seedNetwork(): Promise<void> {
    // Clear existing data
    this.people = [];
    this.links = [];

    // Add seed people
    const seedPeople = [
      { name: "Eda Karaman", role: "UX Designer", category: "work" as const, closeness: 4 as const, city: "İstanbul" },
      { name: "Mert Aksoy", role: "Product Manager", category: "work" as const, closeness: 5 as const, city: "İstanbul" },
      { name: "Zeynep Arslan", role: "Data Analyst", category: "work" as const, closeness: 3 as const, city: "Ankara" },
      { name: "Can Demir", role: "iOS Developer", category: "work" as const, closeness: 4 as const, city: "İzmir" },
      { name: "Elif Yılmaz", role: "Recruiter", category: "work" as const, closeness: 3 as const, city: "İstanbul" },
      { name: "Kerem Kaya", role: "Frontend Developer", category: "work" as const, closeness: 5 as const, city: "İstanbul" },
      { name: "Ayşe Çetin", role: "HR Manager", category: "work" as const, closeness: 4 as const, city: "Ankara" },
      { name: "Emre Şahin", role: "Backend Developer", category: "work" as const, closeness: 4 as const, city: "İstanbul" },
      { name: "Derya Uçar", role: "QA Engineer", category: "work" as const, closeness: 3 as const, city: "İzmir" },
      { name: "Selin Aydın", role: "UX Researcher", category: "work" as const, closeness: 4 as const, city: "İstanbul" },
      { name: "Onur Kaplan", role: "Founder", category: "work" as const, closeness: 5 as const, city: "İstanbul" },
      { name: "İpek Güneş", role: "Advisor", category: "friend" as const, closeness: 4 as const, city: "İstanbul" },
      { name: "Burak Öz", role: "DevRel", category: "friend" as const, closeness: 3 as const, city: "Ankara" },
      { name: "Nazlı Güler", role: "Marketing Manager", category: "work" as const, closeness: 4 as const, city: "İstanbul" },
      { name: "Baran Tunç", role: "Legal Counsel", category: "work" as const, closeness: 3 as const, city: "İstanbul" },
    ];

    for (const person of seedPeople) {
      await this.addPerson({
        ...person,
        email: `${person.name.toLowerCase().replace(' ', '.')}@example.com`,
        phone: `+90 5${Math.floor(Math.random() * 90000000) + 10000000}`,
        services: person.category === "work" ? ["Consulting", "Development"] : [],
        tags: person.category === "work" ? ["Tech", "Professional"] : ["Personal"],
      });
    }

    // Create links
    const people = await this.getPeople();
    const linkData = [
      { source: people[10].id, target: people[0].id },
      { source: people[10].id, target: people[1].id },
      { source: people[10].id, target: people[5].id },
      { source: people[10].id, target: people[7].id },
      { source: people[1].id, target: people[2].id },
      { source: people[1].id, target: people[4].id },
      { source: people[5].id, target: people[8].id },
      { source: people[7].id, target: people[3].id },
      { source: people[4].id, target: people[6].id },
      { source: people[0].id, target: people[9].id },
    ];

    for (const link of linkData) {
      await this.addLink(link);
    }
  }
}

// Factory function to get the appropriate repository
export const useNetworkRepository = (): NetworkRepository => {
  // Check if we're in a browser environment and Supabase is available
  if (typeof window !== 'undefined' && supabase) {
    return new SupabaseNetworkRepository();
  }
  return new MockNetworkRepository();
};
