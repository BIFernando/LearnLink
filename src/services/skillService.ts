import { collection, doc, getDocs, getDoc, addDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
export const fetchAllSkills = async (): Promise<any[]> => { const q = query(collection(db, 'skills'), where('isApproved', '==', true)); const snap = await getDocs(q); return snap.docs.map(d => ({ skillId: d.id, ...d.data() })); };
export const fetchUserSkills = async (userId: string): Promise<any[]> => { const q = query(collection(db, 'userSkills'), where('userId', '==', userId)); const snap = await getDocs(q); return snap.docs.map(d => ({ userSkillId: d.id, ...d.data() })); };
export const addUserSkill = async (userId: string, skillData: any): Promise<any> => { const newSkill = { userId, ...skillData, createdAt: Timestamp.now() }; const ref = await addDoc(collection(db, 'userSkills'), newSkill); return { userSkillId: ref.id, ...newSkill }; };
export const removeUserSkill = async (id: string): Promise<any> => { await deleteDoc(doc(db, 'userSkills', id)); return { success: true }; };
