export interface StudentProfile {
  userId: string;
  displayName?: string;
  profilePhotoUrl?: string;
  bio?: string;
  location?: string;
  isActive?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  level?: number;
}
