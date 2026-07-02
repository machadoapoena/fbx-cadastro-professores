export interface TrainerRegistration {
  id: string;
  name: string;
  cpf: string;
  birthDate?: string;
  phone: string;
  email: string;
  instagram: string;
  fideTitle: string;
  specialties: {
    pedagogical: boolean;
    highPerformance: boolean;
  };
  availability: string[]; // ['morning', 'afternoon', 'night', 'weekend']
  administrativeRegion: string;
  bio: string;
  notes: string;
  createdAt: string;
}

export interface AdminStats {
  total: number;
  pedagogicalCount: number;
  highPerformanceCount: number;
  byRegion: Record<string, number>;
  byTitle: Record<string, number>;
}
