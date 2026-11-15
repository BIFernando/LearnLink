export interface StudentProfile {
  userId: string;
  displayName?: string;
  profilePhotoUrl?: string;
  bio?: string;
  university?: string;
  faculty?: string;
  degree?: string;
  course?: string;
  academicYear?: string;
  location?: string;
  isActive?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  level?: number;
}
