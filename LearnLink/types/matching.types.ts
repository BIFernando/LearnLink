export interface IMatch {
  matchId: string;
  userId: string;
  matchedUserId: string;
  score: number;
  matchedSkills: string[];
  reasons: string[];
  status: string;
  generatedAt: Date;
}

export interface IUser {
  userId: string;
  displayName: string;
  profilePhotoUrl?: string;
  location?: string;
  ratingAverage?: number;
  ratingCount?: number;
}
