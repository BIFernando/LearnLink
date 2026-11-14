import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { auth, db } from "../config/firebase";
import { verifyAdminAccess } from "./adminAuth";

export interface AdminDashboardData {
  totalUsers: number;
  activeUsers: number;
  totalSkills: number;
  totalExchanges: number;
  openReports: number;
  recentActivities: RecentExchangeActivity[];
}

export interface RecentExchangeActivity {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: Date | null;
}

export class AdminDashboardAccessError extends Error {
  constructor() {
    super("Administrator access is required to load dashboard data.");
    this.name = "AdminDashboardAccessError";
  }
}

async function assertAdmin(user: User | null): Promise<void> {
  if (!user || !(await verifyAdminAccess(user))) {
    throw new AdminDashboardAccessError();
  }

  if (auth.currentUser?.uid !== user.uid) {
    throw new AdminDashboardAccessError();
  }
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await assertAdmin(auth.currentUser);

  const usersRef = collection(db, "users");
  const skillsRef = collection(db, "skills");
  const exchangesRef = collection(db, "exchangeRequests");
  const reportsRef = collection(db, "reports");

  const [
    usersCount,
    activeUsersCount,
    skillsCount,
    exchangesCount,
    openReportsCount,
    exchanges,
  ] = await Promise.all([
    getCountFromServer(usersRef),
    getCountFromServer(query(usersRef, where("isActive", "==", true))),
    getCountFromServer(skillsRef),
    getCountFromServer(exchangesRef),
    getCountFromServer(query(reportsRef, where("status", "==", "OPEN"))),
    getDocs(query(exchangesRef, orderBy("createdAt", "desc"), limit(6))),
  ]);

  return {
    totalUsers: usersCount.data().count,
    activeUsers: activeUsersCount.data().count,
    totalSkills: skillsCount.data().count,
    totalExchanges: exchangesCount.data().count,
    openReports: openReportsCount.data().count,
    recentActivities: exchanges.docs.map((document) => {
      const data = document.data();

      return {
        id: document.id,
        senderId: typeof data.senderId === "string" ? data.senderId : "Unknown",
        receiverId:
          typeof data.receiverId === "string" ? data.receiverId : "Unknown",
        status: typeof data.status === "string" ? data.status : "Unknown",
        createdAt:
          data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
      };
    }),
  };
}
