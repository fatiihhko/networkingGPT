import { useNetworkRepository } from '@/services/NetworkRepository';

export const seedNetwork = async () => {
  const repository = useNetworkRepository();
  
  try {
    await repository.seedNetwork();
    console.log('Network seeded successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding network:', error);
    return false;
  }
};

// Sample data for reference
export const samplePeople = [
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

export const sampleLinks = [
  { source: "Onur Kaplan", target: "Eda Karaman" },
  { source: "Onur Kaplan", target: "Mert Aksoy" },
  { source: "Onur Kaplan", target: "Kerem Kaya" },
  { source: "Onur Kaplan", target: "Emre Şahin" },
  { source: "Mert Aksoy", target: "Zeynep Arslan" },
  { source: "Mert Aksoy", target: "Elif Yılmaz" },
  { source: "Kerem Kaya", target: "Derya Uçar" },
  { source: "Emre Şahin", target: "Can Demir" },
  { source: "Elif Yılmaz", target: "Ayşe Çetin" },
  { source: "Eda Karaman", target: "Selin Aydın" },
];
