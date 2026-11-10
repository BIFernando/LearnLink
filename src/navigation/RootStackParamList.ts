// ============================================
// FILE: src/navigation/RootStackParamList.ts
// ============================================

export type RootStackParamList = {
  // Matching Module (Member 3)
  Matches: undefined;
  MatchDetails: { matchId: string };
  MatchExplanation: { matchId: string };

  // Other modules (add as they get integrated)
  Login: undefined;
  Register: undefined;
  Discover: undefined;
  MySkills: undefined;
  CreateExchange: { matchedUserId: string };
  MyExchanges: undefined;
  Chat: undefined;
  AdminDashboard: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}