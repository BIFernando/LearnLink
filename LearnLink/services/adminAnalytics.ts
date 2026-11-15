import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { auth, db } from "../config/firebase";
import { REPORT_STATUSES } from "../types/reports";
import type {
  ExchangeStatus,
  SessionStatus,
} from "../types/member4/member4";
import { verifyAdminAccess } from "./adminAuth";

const POPULARITY_LIMIT = 5;
const COMPLETED_EXCHANGE_STATUS: ExchangeStatus = "COMPLETED";
const COMPLETED_SESSION_STATUS: SessionStatus = "COMPLETED";

export interface AdminPopularityItem {
  label: string;
  count: number;
}

export interface AdminAnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalExchanges: number;
  completedExchanges: number;
  completedSessions: number;
  openReports: number;
  resolvedReports: number;
  userSkillRecordCount: number;
  popularSkills: AdminPopularityItem[];
  popularCategories: AdminPopularityItem[];
}

export class AdminAnalyticsAccessError extends Error {
  constructor() {
    super("Administrator access is required to load analytics.");
    this.name = "AdminAnalyticsAccessError";
  }
}

async function assertAdmin(user: User | null): Promise<void> {
  if (!user || !(await verifyAdminAccess(user))) {
    throw new AdminAnalyticsAccessError();
  }

  if (auth.currentUser?.uid !== user.uid) {
    throw new AdminAnalyticsAccessError();
  }
}

function getStringField(
  data: DocumentData,
  fields: readonly string[]
): string | undefined {
  for (const field of fields) {
    const value = data[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function rankPopularity(
  records: readonly DocumentData[],
  getLabel: (record: DocumentData) => string | undefined
): AdminPopularityItem[] {
  const counts = new Map<string, AdminPopularityItem>();

  for (const record of records) {
    if (!getStringField(record, ["userId"])) {
      continue;
    }

    const label = getLabel(record)?.replace(/\s+/g, " ").trim();
    if (!label) {
      continue;
    }

    const key = label.toLocaleLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label, count: 1 });
    }
  }

  return Array.from(counts.values())
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label)
    )
    .slice(0, POPULARITY_LIMIT);
}

export async function getAdminAnalyticsData(): Promise<AdminAnalyticsData> {
  await assertAdmin(auth.currentUser);

  const usersRef = collection(db, "users");
  const exchangesRef = collection(db, "exchangeRequests");
  const sessionsRef = collection(db, "sessions");
  const reportsRef = collection(db, "reports");
  const [openStatus, resolvedStatus] = REPORT_STATUSES;

  const [
    totalUsersCount,
    activeUsersCount,
    totalExchangesCount,
    completedExchangesCount,
    completedSessionsCount,
    openReportsCount,
    resolvedReportsCount,
    userSkillsSnapshot,
  ] = await Promise.all([
    getCountFromServer(usersRef),
    getCountFromServer(query(usersRef, where("isActive", "==", true))),
    getCountFromServer(exchangesRef),
    getCountFromServer(
      query(exchangesRef, where("status", "==", COMPLETED_EXCHANGE_STATUS))
    ),
    getCountFromServer(
      query(sessionsRef, where("status", "==", COMPLETED_SESSION_STATUS))
    ),
    getCountFromServer(query(reportsRef, where("status", "==", openStatus))),
    getCountFromServer(
      query(reportsRef, where("status", "==", resolvedStatus))
    ),
    getDocs(collection(db, "userSkills")),
  ]);

  const userSkillRecords = userSkillsSnapshot.docs
    .map((document) => document.data())
    .filter((record) => Boolean(getStringField(record, ["userId"])));

  const needsCategoryLookup = userSkillRecords.some(
    (record) =>
      !getStringField(record, ["category"]) &&
      Boolean(getStringField(record, ["categoryId"]))
  );
  const categoryNamesById = new Map<string, string>();

  if (needsCategoryLookup) {
    const categoriesSnapshot = await getDocs(collection(db, "categories"));
    for (const categoryDocument of categoriesSnapshot.docs) {
      const name = getStringField(categoryDocument.data(), ["name"]);
      if (name) {
        categoryNamesById.set(categoryDocument.id, name);
      }
    }
  }

  const popularSkills = rankPopularity(userSkillRecords, (record) =>
    getStringField(record, ["skillName", "name", "skill", "skillId"])
  );
  const popularCategories = rankPopularity(userSkillRecords, (record) => {
    const category = getStringField(record, ["category"]);
    if (category) {
      return category;
    }

    const categoryId = getStringField(record, ["categoryId"]);
    return categoryId ? categoryNamesById.get(categoryId) : undefined;
  });

  return {
    totalUsers: totalUsersCount.data().count,
    activeUsers: activeUsersCount.data().count,
    totalExchanges: totalExchangesCount.data().count,
    completedExchanges: completedExchangesCount.data().count,
    completedSessions: completedSessionsCount.data().count,
    openReports: openReportsCount.data().count,
    resolvedReports: resolvedReportsCount.data().count,
    userSkillRecordCount: userSkillsSnapshot.size,
    popularSkills,
    popularCategories,
  };
}
