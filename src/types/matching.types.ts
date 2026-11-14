export interface IUser {
  userId: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  universityId?: string;
  location?: string;
  profilePhotoUrl?: string;
  ratingAverage?: number;
  ratingCount?: number;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IUserSkill {
  userSkillId: string;
  userId: string;
  skillName: string;
  category?: string;
  level?: number;
  offered?: boolean;
  wanted?: boolean;
  description?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type MatchStatus = 'SUGGESTED' | 'VIEWED' | 'ACCEPTED' | 'DISMISSED';

export interface IMatch {
  matchId: string;
  userId: string;
  matchedUserId: string;
  score: number;
  status: MatchStatus;
  reasons: string[];
  matchedSkills: string[];
  sharedSkills?: string[];
  skillCompatibility?: number;
  generatedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
