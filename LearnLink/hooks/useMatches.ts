import { useCallback, useEffect, useState } from "react";
import type { IMatch } from "../../src/types/matching.types";

import { auth } from "../config/firebase";
import { MatchingService } from "../config/matching.service";

const matchingService = new MatchingService();

export function useMatches(userId?: string) {
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resolvedUserId = userId ?? auth.currentUser?.uid;
      if (!resolvedUserId) {
        setMatches([]);
        setError("User not logged in");
        return;
      }

      setMatches(await matchingService.getMatches(resolvedUserId));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load matches"
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  return {
    matches,
    loading,
    error,
    refresh: loadMatches,
  };
}
