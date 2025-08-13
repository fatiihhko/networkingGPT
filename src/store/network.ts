import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Person, Link, NetworkFilters, NetworkState } from '@/components/network/types';
import { useNetworkRepository } from '@/services/NetworkRepository';

interface NetworkStore extends NetworkState {
  // Actions
  setPeople: (people: Person[]) => void;
  setLinks: (links: Link[]) => void;
  addPerson: (person: Omit<Person, 'id' | 'createdAt'>) => Promise<Person>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<Person>;
  removePerson: (id: string) => Promise<void>;
  addLink: (link: Omit<Link, 'id'>) => Promise<Link>;
  removeLink: (id: string) => Promise<void>;
  setSelectedPersonId: (id: string | null) => void;
  setFilters: (filters: Partial<NetworkFilters>) => void;
  setTimelineDate: (date: string | null) => void;
  setMode: (mode: "2d" | "3d") => void;
  setFocusMode: (focus: boolean) => void;
  focusPerson: (id: string | null) => void;
  seedNetwork: () => Promise<void>;
  loadNetwork: () => Promise<void>;
  
  // Computed
  filteredPeople: Person[];
  filteredLinks: Link[];
  selectedPerson: Person | null;
  focusNeighbors: Person[];
}

export const useNetworkStore = create<NetworkStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    people: [],
    links: [],
    selectedPersonId: null,
    filters: {
      categories: [],
      closenessRange: [1, 5],
      searchTerm: '',
    },
    timelineDate: null,
    mode2d3d: '2d',
    focusMode: false,

    // Actions
    setPeople: (people) => set({ people }),
    setLinks: (links) => set({ links }),
    
    addPerson: async (person) => {
      const repository = useNetworkRepository();
      const newPerson = await repository.addPerson(person);
      set((state) => ({
        people: [...state.people, newPerson],
      }));
      return newPerson;
    },

    updatePerson: async (id, updates) => {
      const repository = useNetworkRepository();
      const updatedPerson = await repository.updatePerson(id, updates);
      set((state) => ({
        people: state.people.map(p => p.id === id ? updatedPerson : p),
      }));
      return updatedPerson;
    },

    removePerson: async (id) => {
      const repository = useNetworkRepository();
      await repository.removePerson(id);
      set((state) => ({
        people: state.people.filter(p => p.id !== id),
        links: state.links.filter(l => l.source !== id && l.target !== id),
        selectedPersonId: state.selectedPersonId === id ? null : state.selectedPersonId,
      }));
    },

    addLink: async (link) => {
      const repository = useNetworkRepository();
      const newLink = await repository.addLink(link);
      set((state) => ({
        links: [...state.links, newLink],
      }));
      return newLink;
    },

    removeLink: async (id) => {
      const repository = useNetworkRepository();
      await repository.removeLink(id);
      set((state) => ({
        links: state.links.filter(l => l.id !== id),
      }));
    },

    setSelectedPersonId: (id) => set({ selectedPersonId: id }),
    
    setFilters: (filters) => set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
    
    setTimelineDate: (date) => set({ timelineDate: date }),
    
    setMode: (mode) => set({ mode2d3d: mode }),
    
    setFocusMode: (focus) => set({ focusMode: focus }),
    
    focusPerson: (id) => {
      set({ selectedPersonId: id, focusMode: !!id });
    },

    seedNetwork: async () => {
      const repository = useNetworkRepository();
      await repository.seedNetwork();
      const people = await repository.getPeople();
      const links = await repository.getLinks();
      set({ people, links });
    },

    loadNetwork: async () => {
      const repository = useNetworkRepository();
      const people = await repository.getPeople();
      const links = await repository.getLinks();
      set({ people, links });
    },

    // Computed properties
    get filteredPeople() {
      const { people, filters, timelineDate } = get();
      
      return people.filter(person => {
        // Timeline filter
        if (timelineDate && person.createdAt > timelineDate) {
          return false;
        }
        
        // Category filter
        if (filters.categories.length > 0 && !filters.categories.includes(person.category || 'other')) {
          return false;
        }
        
        // Closeness filter
        const closeness = person.closeness || 3;
        if (closeness < filters.closenessRange[0] || closeness > filters.closenessRange[1]) {
          return false;
        }
        
        // Search filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const searchableText = [
            person.name,
            person.handle,
            person.role,
            person.city,
            person.email,
          ].filter(Boolean).join(' ').toLowerCase();
          
          if (!searchableText.includes(searchLower)) {
            return false;
          }
        }
        
        return true;
      });
    },

    get filteredLinks() {
      const { links, filteredPeople } = get();
      const visiblePersonIds = new Set(filteredPeople.map(p => p.id));
      
      return links.filter(link => 
        visiblePersonIds.has(link.source) && visiblePersonIds.has(link.target)
      );
    },

    get selectedPerson() {
      const { people, selectedPersonId } = get();
      return people.find(p => p.id === selectedPersonId) || null;
    },

    get focusNeighbors() {
      const { people, links, selectedPersonId } = get();
      if (!selectedPersonId) return [];
      
      const neighborIds = new Set<string>();
      
      // Add direct neighbors (1-hop)
      links.forEach(link => {
        if (link.source === selectedPersonId) {
          neighborIds.add(link.target);
        } else if (link.target === selectedPersonId) {
          neighborIds.add(link.source);
        }
      });
      
      return people.filter(p => neighborIds.has(p.id));
    },
  }))
);

// Hotkeys setup
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    const store = useNetworkStore.getState();
    
    // N - Quick Add
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      // This will be handled by the VisualNetworkMap component
    }
    
    // F - Focus selected / clear focus
    if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (store.selectedPersonId) {
        store.setFocusMode(!store.focusMode);
      }
    }
    
    // T - Toggle 2D/3D
    if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      store.setMode(store.mode2d3d === '2d' ? '3d' : '2d');
    }
    
    // Cmd/Ctrl+K - Search
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      // This will be handled by the search component
    }
  });
}
