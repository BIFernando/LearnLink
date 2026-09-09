import { 
    collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
    query, where, Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const SKILLS_COLLECTION = 'skills';
const USER_SKILLS_COLLECTION = 'userSkills';
const USERS_COLLECTION = 'users';

// ============================================
// 1. GET ALL SKILLS
// ============================================
export const fetchAllSkills = async () => {
    try {
        const skillsRef = collection(db, SKILLS_COLLECTION);
        const q = query(skillsRef, where('isApproved', '==', true));
        const querySnapshot = await getDocs(q);
        const skills = [];
        querySnapshot.forEach((doc) => {
            skills.push({ skillId: doc.id, ...doc.data() });
        });
        return skills;
    } catch (error) {
        console.error('Error fetching skills:', error);
        throw error;
    }
};

// ============================================
// 2. GET USER'S SKILLS
// ============================================
export const fetchUserSkills = async (userId) => {
    try {
        const userSkillsRef = collection(db, USER_SKILLS_COLLECTION);
        const q = query(userSkillsRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        const userSkills = [];
        querySnapshot.forEach((doc) => {
            userSkills.push({ userSkillId: doc.id, ...doc.data() });
        });
        return userSkills;
    } catch (error) {
        console.error('Error fetching user skills:', error);
        throw error;
    }
};

// ============================================
// 3. GET USER'S OFFERED SKILLS
// ============================================
export const fetchUserOfferedSkills = async (userId) => {
    try {
        const userSkillsRef = collection(db, USER_SKILLS_COLLECTION);
        const q = query(
            userSkillsRef, 
            where('userId', '==', userId),
            where('type', '==', 'OFFER')
        );
        const querySnapshot = await getDocs(q);
        const offeredSkills = [];
        querySnapshot.forEach((doc) => {
            offeredSkills.push({ userSkillId: doc.id, ...doc.data() });
        });
        return offeredSkills;
    } catch (error) {
        console.error('Error fetching offered skills:', error);
        throw error;
    }
};

// ============================================
// 4. GET USER'S WANTED SKILLS
// ============================================
export const fetchUserWantedSkills = async (userId) => {
    try {
        const userSkillsRef = collection(db, USER_SKILLS_COLLECTION);
        const q = query(
            userSkillsRef, 
            where('userId', '==', userId),
            where('type', '==', 'WANT')
        );
        const querySnapshot = await getDocs(q);
        const wantedSkills = [];
        querySnapshot.forEach((doc) => {
            wantedSkills.push({ userSkillId: doc.id, ...doc.data() });
        });
        return wantedSkills;
    } catch (error) {
        console.error('Error fetching wanted skills:', error);
        throw error;
    }
};

// ============================================
// 5. ADD A SKILL
// ============================================
export const addUserSkill = async (userId, skillData) => {
    try {
        const userSkillsRef = collection(db, USER_SKILLS_COLLECTION);
        const q = query(
            userSkillsRef,
            where('userId', '==', userId),
            where('skillId', '==', skillData.skillId),
            where('type', '==', skillData.type)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error('You already have this skill listed');
        }
        const newSkill = {
            userId: userId,
            skillId: skillData.skillId,
            type: skillData.type,
            proficiency: skillData.proficiency || 'BEGINNER',
            yearsExperience: skillData.yearsExperience || 0,
            description: skillData.description || '',
            createdAt: Timestamp.now()
        };
        const docRef = await addDoc(userSkillsRef, newSkill);
        return { userSkillId: docRef.id, ...newSkill };
    } catch (error) {
        console.error('Error adding user skill:', error);
        throw error;
    }
};

// ============================================
// 6. UPDATE A SKILL
// ============================================
export const updateUserSkill = async (userSkillId, updateData) => {
    try {
        const userSkillRef = doc(db, USER_SKILLS_COLLECTION, userSkillId);
        await updateDoc(userSkillRef, updateData);
        return { userSkillId, ...updateData };
    } catch (error) {
        console.error('Error updating user skill:', error);
        throw error;
    }
};

// ============================================
// 7. REMOVE A SKILL
// ============================================
export const removeUserSkill = async (userSkillId) => {
    try {
        const userSkillRef = doc(db, USER_SKILLS_COLLECTION, userSkillId);
        await deleteDoc(userSkillRef);
        return { success: true, userSkillId };
    } catch (error) {
        console.error('Error removing user skill:', error);
        throw error;
    }
};

// ============================================
// 8. SEARCH STUDENTS
// ============================================
export const searchStudents = async (searchParams = {}) => {
    try {
        let userSkillsRef = collection(db, USER_SKILLS_COLLECTION);
        let constraints = [];
        if (searchParams.skillId) {
            constraints.push(where('skillId', '==', searchParams.skillId));
        }
        if (searchParams.type) {
            constraints.push(where('type', '==', searchParams.type));
        }
        let q = query(userSkillsRef, ...constraints);
        const querySnapshot = await getDocs(q);
        
        const userIds = new Set();
        const userSkillsMap = {};
        querySnapshot.forEach((doc) => {
            const data = { userSkillId: doc.id, ...doc.data() };
            const userId = data.userId;
            userIds.add(userId);
            if (!userSkillsMap[userId]) {
                userSkillsMap[userId] = [];
            }
            userSkillsMap[userId].push(data);
        });
        
        const students = [];
        for (const userId of userIds) {
            const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (!userData.isActive) continue;
                if (searchParams.searchText) {
                    const searchLower = searchParams.searchText.toLowerCase();
                    const nameMatch = userData.displayName?.toLowerCase().includes(searchLower);
                    const bioMatch = userData.bio?.toLowerCase().includes(searchLower);
                    if (!nameMatch && !bioMatch) continue;
                }
                students.push({
                    userId: userId,
                    displayName: userData.displayName || 'Unknown',
                    profilePhotoUrl: userData.profilePhotoUrl,
                    bio: userData.bio,
                    ratingAverage: userData.ratingAverage || 0,
                    ratingCount: userData.ratingCount || 0,
                    level: userData.level || 1,
                    location: userData.location,
                    skills: userSkillsMap[userId] || [],
                });
            }
        }
        return students;
    } catch (error) {
        console.error('Error searching students:', error);
        throw error;
    }
};

// ============================================
// 9. GET STUDENT PROFILE
// ============================================
export const fetchStudentProfile = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
        if (!userDoc.exists()) {
            throw new Error('User not found');
        }
        const userData = userDoc.data();
        const userSkills = await fetchUserSkills(userId);
        const offeredSkills = userSkills.filter(s => s.type === 'OFFER');
        const wantedSkills = userSkills.filter(s => s.type === 'WANT');
        const offeredWithDetails = await getSkillDetails(offeredSkills);
        const wantedWithDetails = await getSkillDetails(wantedSkills);
        return {
            ...userData,
            userId: userId,
            offeredSkills: offeredWithDetails,
            wantedSkills: wantedWithDetails,
            allSkills: userSkills
        };
    } catch (error) {
        console.error('Error fetching student profile:', error);
        throw error;
    }
};

// ============================================
// 10. GET SKILL CATEGORIES
// ============================================
export const getSkillsByCategory = async () => {
    try {
        const allSkills = await fetchAllSkills();
        const categories = {};
        allSkills.forEach(skill => {
            if (!categories[skill.category]) {
                categories[skill.category] = [];
            }
            categories[skill.category].push(skill);
        });
        return categories;
    } catch (error) {
        console.error('Error getting skills by category:', error);
        throw error;
    }
};

// ============================================
// HELPER: Get skill details
// ============================================
const getSkillDetails = async (userSkills) => {
    const skillDetails = [];
    for (const userSkill of userSkills) {
        const skillDoc = await getDoc(doc(db, SKILLS_COLLECTION, userSkill.skillId));
        if (skillDoc.exists()) {
            skillDetails.push({
                ...userSkill,
                skillDetails: skillDoc.data()
            });
        }
    }
    return skillDetails;
};