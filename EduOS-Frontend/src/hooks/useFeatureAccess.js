import { useSelector } from 'react-redux';
import { selectSubscription } from '@redux/slices/subscription.slice.js';

export default function useFeatureAccess() {
  const subscription = useSelector(selectSubscription);

  const hasAccess = (featureKey) => {
    if (!subscription || !subscription.features) return false;
    return !!subscription.features[featureKey];
  };

  return {
    plan: subscription?.plan || 'FREE',
    status: subscription?.status || 'ACTIVE',
    isPremium: subscription?.isPremium || false,
    hasAccess,
    loading: subscription?.loading || false,
    error: subscription?.error || null,
  };
}
