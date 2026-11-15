import type { Timestamp } from "firebase/firestore";

export const SKILL_TYPES = ["OFFER", "WANT"] as const;
export type SkillType = (typeof SKILL_TYPES)[number];

export const SKILL_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SESSION_MODES = ["ONLINE", "IN_PERSON"] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export interface SkillCatalogItem {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  description?: string;
}

export interface StudentSkill {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  categoryId?: string;
  type: SkillType;
  proficiencyLevel: SkillLevel;
  description?: string;
  yearsExperience?: number;
  sessionModes: SessionMode[];
  availability?: string;
  createdAt?: Timestamp;
}

export interface StudentDirectoryProfile {
  userId: string;
  displayName: string;
  profilePhotoUrl?: string;
  bio?: string;
  location?: string;
  universityId?: string;
  university?: string;
  faculty?: string;
  course?: string;
  ratingAverage?: number;
  ratingCount?: number;
  skills: StudentSkill[];
}

export interface UserSkillInput {
  skillId: string;
  type: SkillType;
  proficiencyLevel: SkillLevel;
  description: string;
  yearsExperience: number;
  sessionModes: SessionMode[];
  availability: string;
}

export interface SkillSuggestionInput {
  name: string;
  categoryId: string;
  description: string;
}
