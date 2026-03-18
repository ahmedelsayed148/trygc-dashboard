import React from 'react';
import { FeatureGate } from './FeatureGate';
import { UserManagement } from './UserManagement';

export function UserManagementRoute() {
  return (
    <FeatureGate featureId="user-management">
      <UserManagement />
    </FeatureGate>
  );
}
