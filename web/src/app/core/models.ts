export interface AuthConfig {
  googleClientId: string | null;
  demoLoginEnabled: boolean;
  placesEnabled: boolean;
  geminiEnabled: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  photoUrl: string | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Cuisine {
  code: string;
  label: string;
  emoji: string;
}

export interface CandidateQuery {
  lat: number;
  lng: number;
  radius: number;
  cuisines?: string[];
  maxPrice?: number | null;
  excludeIds?: number[];
  avoidDays?: number;
  limit?: number;
}

export interface Candidate {
  id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  distanceM: number;
  cuisines: string[];
  cuisineLabels: string;
  priceLevel: number | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  myRating: number | null;
  myVisitCount: number;
  lastVisitAt: string | null;
  lastNote: string | null;
  isFavorite: boolean;
  mapsUrl: string | null;
  score: number;
}

export interface SuggestionResponse {
  restaurant: Candidate | null;
  reason: string;
  aiUsed: boolean;
  suggestionLogId: number | null;
  alternatives: Candidate[];
}

export interface Visit {
  id: number;
  visitedAt: string;
  source: 'suggestion' | 'wheel' | 'manual';
  stars: number | null;
  note: string | null;
  ratedAt: string | null;
  restaurantId: number;
  restaurantName: string;
  address: string | null;
  cuisineLabels: string;
  mapsUrl: string | null;
}

export interface HistoryStats {
  totalVisits: number;
  unrated: number;
  averageStars: number | null;
  topRestaurant: string | null;
  topRestaurantCount: number;
}

export type PreferenceType = 'Favorite' | 'Blacklist';

export interface Preference {
  restaurantId: number;
  restaurantName: string;
  type: PreferenceType;
  createdAt: string;
}

export interface RoomOption {
  id: number;
  restaurantId: number;
  restaurantName: string;
  cuisineLabels: string;
  googleRating: number | null;
  voteCount: number;
  voters: string[];
}

export interface Room {
  id: number;
  code: string;
  title: string;
  creatorUserId: number;
  isClosed: boolean;
  winningRestaurantId: number | null;
  winningRestaurantName: string | null;
  myVotedOptionId: number | null;
  options: RoomOption[];
  totalVotes: number;
}

