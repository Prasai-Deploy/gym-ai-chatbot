import { useAuth } from '../../../context/AuthContext';
import { useOwnerOverview } from './useOwnerOverview';

export const OWNER_ROLES = [
  'Organization Owner',
  'Gym Owner', // Legacy synonym normalized
  'Gym Manager',
  'Platform Super Admin',
  'Front Desk',
  'Trainer',
];

export function useOwnerAccess() {
  const { user } = useAuth();
  const { data: overview, error } = useOwnerOverview();

  const userRole = user?.role || '';
  const isDemo = user?.email?.toLowerCase() === 'demo@sweatfix.com' || userRole === 'Demo User';

  // Demo users cannot access the real gym owner OS
  if (isDemo) {
    return {
      isAuthorized: false,
      role: 'Demo User',
      isOwner: false,
      isManager: false,
      isSuperAdmin: false,
      isFrontDesk: false,
      isTrainer: false,
      isStaff: false,
      isDemo: true,
      errorStatus: 403,
    };
  }

  // Super Admin check
  const isSuperAdmin = userRole === 'Platform Super Admin';

  // Role match
  const isOwner = userRole === 'Organization Owner' || userRole === 'Gym Owner';
  const isManager = userRole === 'Gym Manager';
  const isFrontDesk = userRole === 'Front Desk';
  const isTrainer = userRole === 'Trainer';

  // Also check if user is the direct owner_id of the organization
  const isDirectOwner = Boolean(
    user?.id && overview?.organization?.owner_id && user.id === overview.organization.owner_id
  );

  // If backend returned 403 on overview, user is not authorized
  const isBackendForbidden = (error as any)?.status === 403;

  const isStaff = isSuperAdmin || isOwner || isManager || isDirectOwner || isFrontDesk || isTrainer;
  const isAuthorized = !isBackendForbidden && isStaff;

  return {
    isAuthorized,
    role: userRole || (isDirectOwner ? 'Organization Owner' : 'Member'),
    isOwner: isOwner || isDirectOwner,
    isManager,
    isSuperAdmin,
    isFrontDesk,
    isTrainer,
    isStaff,
    isDemo: false,
    errorStatus: (error as any)?.status,
  };
}

