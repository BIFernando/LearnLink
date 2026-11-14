import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/config/firebase";
import type { GamifiedUser } from "@/types/member5";

/**
 * Read-only access to users/{userId} (owned by Member 1).
 * Profiles are cached for the app session to avoid refetching in lists.
 */
const profileCache = new Map<string, Promise<GamifiedUser | null>>();

function toGamifiedUser(userId: string, data: Record<string, unknown>): GamifiedUser {
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
  const str = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : undefined);
  return {
    userId,
    displayName: str(data.displayName),
    profilePhotoUrl: str(data.profilePhotoUrl),
    xp: num(data.xp),
    level: num(data.level),
    streak: num(data.streak),
    ratingAverage: num(data.ratingAverage),
    ratingCount: num(data.ratingCount),
  };
}

export function getUserProfile(userId: string): Promise<GamifiedUser | null> {
  const cached = profileCache.get(userId);
  if (cached) return cached;

  const request = getDoc(doc(db, "users", userId))
    .then((snapshot) => (snapshot.exists() ? toGamifiedUser(userId, snapshot.data()) : null))
    .catch((error: unknown) => {
      profileCache.delete(userId);
      throw error;
    });
  profileCache.set(userId, request);
  return request;
}

export function displayNameOf(user: GamifiedUser | null | undefined): string {
  return user?.displayName ?? "LearnLink Peer";
}

/** Loads several profiles; missing or failed ones map to null. */
export function useUserProfiles(userIds: string[]): Record<string, GamifiedUser | null> {
  const [profiles, setProfiles] = useState<Record<string, GamifiedUser | null>>({});
  const key = [...new Set(userIds)].sort().join(",");

  useEffect(() => {
    let active = true;
    const ids = key ? key.split(",") : [];
    Promise.all(
      ids.map(async (id) => {
        try {
          return [id, await getUserProfile(id)] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((entries) => {
      if (active) setProfiles(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [key]);

  return profiles;
}

/** Live view of one user (xp/level/streak update as Cloud Functions award XP). */
export function useLiveUser(userId: string | undefined) {
  const [user, setUser] = useState<GamifiedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(
      doc(db, "users", userId),
      (snapshot) => {
        setUser(snapshot.exists() ? toGamifiedUser(userId, snapshot.data()) : { userId });
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [userId]);

  return { user, loading, error };
}
