import { db as firestore } from '../../config/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { MatchingEngine } from './MatchingEngine';
import type { IMatch, IUser } from '../../../src/types/matching.types';

const engine = new MatchingEngine();

export class MatchingService {
  async getMatches(userId: string): Promise<IMatch[]> {
    try {
      const usersSnap = await getDocs(collection(firestore, 'users'));
      const allUsers = usersSnap.docs.map((docItem) => ({
        userId: docItem.id,
        ...docItem.data(),
      }));

      const skillsSnap = await getDocs(collection(firestore, 'userSkills'));
      const allUserSkills = skillsSnap.docs.map((docItem) => ({
        userSkillId: docItem.id,
        ...docItem.data(),
      }));

      if (allUsers.length === 0) {
        return [];
      }

      return engine.generateMatches(userId, allUsers, allUserSkills) as IMatch[];
    } catch (error) {
      console.error('Error fetching matches from Firebase:', error);
      return [];
    }
  }

  async getUser(userId: string): Promise<IUser | null> {
    try {
      const userSnap = await getDoc(doc(firestore, 'users', userId));

      if (userSnap.exists()) {
        return { userId: userSnap.id, ...userSnap.data() } as IUser;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user from Firebase:', error);
      return null;
    }
  }
}

export default MatchingService;
