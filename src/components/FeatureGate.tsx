import React, { useContext } from 'react';
import { AppContext } from './Root';
import { Shield } from 'lucide-react';
import { resolveFeatureIds } from '../lib/navigation';

const OWNER_EMAIL = 'ahmedlalatoo2013@gmail.com';

interface FeatureGateProps {
  featureId: string;
  children: React.ReactNode;
}

export function FeatureGate({ featureId, children }: FeatureGateProps) {
  const ctx = useContext(AppContext);
  const isAdmin = ctx?.isAdmin || false;
  const userEmail = ctx?.userEmail || '';
  const userFeatures = ctx?.userFeatures as string[] | null;

  // Owner always has full access to everything
  if (userEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    return <>{children}</>;
  }

  const activeFeatures = resolveFeatureIds({
    isAdmin,
    userEmail,
    userFeatures,
  });

  if (!activeFeatures.includes(featureId)) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
          <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Access Restricted</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            You don't have access to this feature. Contact an administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
