import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================
// 1. GET USER BY ID
// ============================================
export const getUserById = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            return { userId: userId, ...userDoc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        throw error;
    }
};

// ============================================
// 2. UPDATE USER PROFILE
// ============================================
export const updateUserProfile = async (userId, updateData) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            ...updateData,
            updatedAt: new Date()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};