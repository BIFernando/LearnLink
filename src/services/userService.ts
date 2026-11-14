import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
export const getUserById = async (userId: string): Promise<any> => { const d = await getDoc(doc(db, 'users', userId)); return d.exists() ? { userId: d.id, ...d.data() } : null; };
export const updateUserProfile = async (userId: string, data: any): Promise<any> => { await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: new Date() }); return { success: true }; };
