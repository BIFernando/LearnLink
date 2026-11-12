// ============================================
// FILE: src/hooks/useMatches.ts
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { MatchingService } from '../../LearnLink/config/matching.service';
import { auth } from '../services/firebase/config';
import { IMatch } from '../types/matching.types';

const matchingService = new MatchingService();

export const useMatches = (userId?: string) => {
  const [matches, setMatches] = useState<IMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resolvedUserId = userId ?? auth.currentUser?.uid;

      if (!resolvedUserId) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      const userMatches = await matchingService.getMatches(resolvedUserId);
      setMatches(userMatches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateMatchStatus = useCallback(async (
    matchId: string,
    status: IMatch['status']
  ) => {
    try {
      await matchingService.updateMatchStatus(matchId, status);
      setMatches(prev =>
        prev.map(m => m.matchId === matchId ? { ...m, status } : m)
      );
    } catch (error) {
      console.error('Error updating match:', error);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return {
    matches,
    loading,
    error,
    refresh: loadMatches,
    updateMatchStatus,
  };
};