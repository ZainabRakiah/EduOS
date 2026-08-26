export const FEATURES = {
  DASHBOARD: {
    key: 'dashboard',
    name: 'Dashboard',
    requiredPlan: 'FREE',
  },
  NOTES: {
    key: 'notes',
    name: 'Notes',
    requiredPlan: 'FREE',
  },
  RESOURCES: {
    key: 'resources',
    name: 'Resources',
    requiredPlan: 'FREE',
  },
  LEARNING_HISTORY: {
    key: 'learning_history',
    name: 'Learning History',
    requiredPlan: 'FREE',
  },
  FORMULA_BOOK: {
    key: 'formula_book',
    name: 'Formula Book',
    requiredPlan: 'FREE',
  },
  AI_EXPLAINER: {
    key: 'ai_explainer',
    name: 'AI Explainer',
    requiredPlan: 'PREMIUM',
  },
  MOCK_TESTS: {
    key: 'mock_tests',
    name: 'Mock Tests',
    requiredPlan: 'PREMIUM',
  },
};

export function canAccess(plan, featureKey) {
  const feat = Object.values(FEATURES).find((f) => f.key === featureKey);
  if (!feat) return false;
  if (feat.requiredPlan === 'FREE') return true;
  return plan === 'PREMIUM';
}
