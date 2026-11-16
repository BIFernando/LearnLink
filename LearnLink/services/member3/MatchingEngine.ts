// ============================================
// FILE: services/member3/MatchingEngine.ts
// Member 3 - Matching Algorithm
// ============================================

export class MatchingEngine {
  private WEIGHTS = {
    SKILL: 0.40,
    PROFICIENCY: 0.20,
    AVAILABILITY: 0.15,
    LOCATION: 0.10,
    REPUTATION: 0.10,
    EXPERIENCE: 0.05
  };

  generateMatches(userId: string, allUsers: any[], allUserSkills: any[]): any[] {
    const currentUser = allUsers.find(u => u.userId === userId);
    if (!currentUser) return [];

    const userSkills = allUserSkills.filter(s => s.userId === userId);
    const userOffers = userSkills.filter(s => s.type === 'OFFER');
    const userWants = userSkills.filter(s => s.type === 'WANT');

    const candidates = allUsers.filter(u => 
      u.userId !== userId && u.universityId === currentUser.universityId
    );

    const scoredCandidates: any[] = [];

    for (const candidate of candidates) {
      const candidateSkills = allUserSkills.filter(s => s.userId === candidate.userId);
      const candidateOffers = candidateSkills.filter(s => s.type === 'OFFER');
      const candidateWants = candidateSkills.filter(s => s.type === 'WANT');

      let score = 0;
      
      // Calculate Skill Compatibility
      const matchesWanted = userWants.filter(uw => candidateOffers.some(co => co.skillId === uw.skillId));
      if (matchesWanted.length > 0) { 
        score += 0.6; 
        score += Math.min(matchesWanted.length * 0.1, 0.3); 
      }
      
      // Calculate Reciprocal Match
      const reciprocalMatches = userOffers.filter(uo => candidateWants.some(cw => cw.skillId === uo.skillId));
      if (reciprocalMatches.length > 0) { 
        score += 0.3; 
        score += Math.min(reciprocalMatches.length * 0.05, 0.1); 
      }
      
      if (score === 0) continue; // Skip if no skills match

      const totalScore = Math.min(score, 1.0);
      
      scoredCandidates.push({
        userId: candidate.userId,
        score: Math.round(totalScore * 100),
        matchedSkills: [
          ...matchesWanted.map(m => m.skillName || m.skillId), 
          ...reciprocalMatches.map(m => m.skillName || m.skillId)
        ],
        reasons: [`You match on ${matchesWanted[0]?.skillName || 'skills'}`],
      });
    }

    // Sort by highest score
    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates.slice(0, 20).map((c) => ({
      matchId: `match_${c.userId}_${Date.now()}`,
      userId: userId, 
      matchedUserId: c.userId,
      score: c.score, 
      matchedSkills: c.matchedSkills, 
      reasons: c.reasons,
      status: 'SUGGESTED', 
      generatedAt: new Date()
    }));
  }
}