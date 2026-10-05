export interface UserProfile {
  id: string;
  email: string;
  nom?: string;
  telephone?: string;
  avatar?: string;
  estConnecte: boolean;
  dateInscription: string;
  derniereConnexion: string;
  statutMembre: 'Turfiste Certifié' | 'Abonné VIP' | 'Pronostiqueur Pro' | 'Membre Administrateur / VIP';
  analysesEffectuees: number;
  pays?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
