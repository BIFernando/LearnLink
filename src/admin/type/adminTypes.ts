export interface AdminUser {
  id: string;
  name: string;
  email: string;
  university: string;
  faculty: string;
  status: "active" | "suspended";
}

export interface AdminReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  status: "pending" | "resolved";
}

export interface AdminSkill {
  id: string;
  name: string;
  category: string;
  status: "active" | "inactive";
}