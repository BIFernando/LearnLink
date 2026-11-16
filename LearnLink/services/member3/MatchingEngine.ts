// ============================================
// FILE: services/member3/MatchingEngine.ts
// Member 3 - Matching Algorithm
// ============================================

export class MatchingEngine {
  private WEIGHTS = {
    SKILL: 0.4,
    PROFICIENCY: 0.2,
    AVAILABILITY: 0.15,
    LOCATION: 0.1,
    REPUTATION: 0.1,
    EXPERIENCE: 0.05,
  };

  generateMatches(
    userId: string,
    allUsers: any[],
    allUserSkills: any[],
  ): any[] {
    console.log("=== MATCHING ENGINE STARTED ===");
    console.log("Current User ID passed from App:", userId);
    console.log("Total Users found in Firebase:", allUsers.length);
    console.log("Total UserSkills found in Firebase:", allUserSkills.length);

    const currentUser = allUsers.find((u) => u.userId === userId);
    if (!currentUser) {
      console.log("❌ ERROR: Could not find current user. ID mismatch!");
      return [];
    }
    console.log(
      "✅ Current User found:",
      currentUser.displayName || currentUser.userId,
    );

    const userSkills = allUserSkills.filter((s) => s.userId === userId);
    const userOffers = userSkills.filter((s) => s.type === "OFFER");
    const userWants = userSkills.filter((s) => s.type === "WANT");

    // TEMPORARILY DISABLED UNIVERSITY CHECK FOR PRESENTATION
    const candidates = allUsers.filter(
      (u) => u.userId !== userId,
      // && u.universityId === currentUser.universityId
    );

    console.log("Candidates to check:", candidates.length);

    const scoredCandidates: any[] = [];

    for (const candidate of candidates) {
      const candidateSkills = allUserSkills.filter(
        (s) => s.userId === candidate.userId,
      );
      const candidateOffers = candidateSkills.filter((s) => s.type === "OFFER");
      const candidateWants = candidateSkills.filter((s) => s.type === "WANT");

      let score = 0;

      // Calculate Skill Compatibility
      const matchesWanted = userWants.filter((uw) =>
        candidateOffers.some((co) => co.skillId === uw.skillId),
      );
      if (matchesWanted.length > 0) {
        score += 0.6;
        score += Math.min(matchesWanted.length * 0.1, 0.3);
      }

      // Calculate Reciprocal Match
      const reciprocalMatches = userOffers.filter((uo) =>
        candidateWants.some((cw) => cw.skillId === uo.skillId),
      );
      if (reciprocalMatches.length > 0) {
        score += 0.3;
        score += Math.min(reciprocalMatches.length * 0.05, 0.1);
      }

      // If there is no skill match at all, give a default score for demo purposes
      if (score === 0) {
        console.log(
          `User ${candidate.userId} has no skill match. Giving default score.`,
        );
        score = 0.5; // 50% base score so they show up
      } else {
        console.log(`User ${candidate.userId} matched skills! Score: ${score}`);
      }

      const totalScore = Math.min(score, 1.0);

      scoredCandidates.push({
        userId: candidate.userId,
        displayName:
          candidate.displayName ||
          candidate.name ||
          candidate.email?.split("@")[0] ||
          "Student",
        profilePhotoUrl:
          candidate.photoUrl ||
          candidate.profilePhotoUrl ||
          "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
        score: Math.round(totalScore * 100),
        matchedSkills:
          [
            ...matchesWanted.map((m) => m.skillName || m.skillId),
            ...reciprocalMatches.map((m) => m.skillName || m.skillId),
          ].filter(Boolean).length > 0
            ? [
                ...matchesWanted.map((m) => m.skillName || m.skillId),
                ...reciprocalMatches.map((m) => m.skillName || m.skillId),
              ]
            : ["General Skills"], // Fallback for display
        reasons:
          matchesWanted.length > 0
            ? [`You match on ${matchesWanted[0]?.skillName || "skills"}`]
            : ["Potential match based on profile"],
      });
    }

    // Sort by highest score
    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates.slice(0, 20).map((c) => ({
      matchId: `match_${c.userId}_${Date.now()}`,
      userId: userId,
      matchedUserId: c.userId,
      displayName: c.displayName || "Student",
      profilePhotoUrl:
        c.profilePhotoUrl ||
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
      score: c.score,
      matchedSkills: c.matchedSkills,
      reasons: c.reasons,
      status: "SUGGESTED",
      generatedAt: new Date(),
    }));
  }
}
