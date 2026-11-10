// ============================================
// FILE: src/services/firebase/matching.service.ts
// ============================================

import { firestore } from '../../src/services/firebase/config';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { IMatch, IUser, IUserSkill } from '../../src/types/matching.types';

export class MatchingService {
  // ──────────────────────────────────────────────
  // GET USER DATA
  // ──────────────────────────────────────────────

  async getUser(userId: string): Promise<IUser | null> {
    try {
      const docRef = doc(firestore, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { userId, ...docSnap.data() } as IUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getUserSkills(userId: string): Promise<IUserSkill[]> {
    try {
      const q = query(
        collection(firestore, 'userSkills'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        userSkillId: doc.id,
        ...doc.data(),
      })) as IUserSkill[];
    } catch (error) {
      console.error('Error getting user skills:', error);
      return [];
    }
  }

  async getAllUsers(universityId: string): Promise<IUser[]> {
    try {
      const q = query(
        collection(firestore, 'users'),
        where('universityId', '==', universityId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data(),
      })) as IUser[];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async getAllUserSkills(): Promise<IUserSkill[]> {
    try {
      const snapshot = await getDocs(collection(firestore, 'userSkills'));
      return snapshot.docs.map(doc => ({
        userSkillId: doc.id,
        ...doc.data(),
      })) as IUserSkill[];
    } catch (error) {
      console.error('Error getting all user skills:', error);
      return [];
    }
  }

  // ──────────────────────────────────────────────
  // MATCHES CRUD
  // ──────────────────────────────────────────────

  async getMatches(userId: string): Promise<IMatch[]> {
    try {
      const q = query(
        collection(firestore, 'matches'),
        where('userId', '==', userId),
        orderBy('score', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          matchId: doc.id,
          ...data,
          generatedAt: data.generatedAt?.toDate() || new Date(),
        } as IMatch;
      });
    } catch (error) {
      console.error('Error getting matches:', error);
      return [];
    }
  }

  async saveMatches(matches: IMatch[]): Promise<void> {
    try {
      const batch = writeBatch(firestore);
      for (const match of matches) {
        const docRef = doc(collection(firestore, 'matches'));
        batch.set(docRef, {
          ...match,
          generatedAt: Timestamp.now(),
        });
      }
      await batch.commit();
    } catch (error) {
      console.error('Error saving matches:', error);
      throw error;
    }
  }

  async updateMatchStatus(
    matchId: string,
    status: 'SUGGESTED' | 'VIEWED' | 'ACCEPTED' | 'DISMISSED'
  ): Promise<void> {
    try {
      await updateDoc(doc(firestore, 'matches', matchId), {
        status,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating match status:', error);
    }
  }

  async deleteMatch(matchId: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'matches', matchId));
    } catch (error) {
      console.error('Error deleting match:', error);
    }
  }

  async deleteOldMatches(userId: string): Promise<void> {
    try {
      const q = query(
        collection(firestore, 'matches'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);
      snapshot.docs.forEach(docItem => batch.delete(docItem.ref));
      await batch.commit();
    } catch (error) {
      console.error('Error deleting old matches:', error);
    }
  }
}