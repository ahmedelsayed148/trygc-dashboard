import type { CampaignTeamTask } from './operations';

interface AssignmentNotificationParams {
  currentNotifications: any[];
  previousTask?: CampaignTeamTask;
  nextTask: CampaignTeamTask;
  campaignId: string;
  campaignName: string;
  assignedBy: string;
}

export function createAssignmentNotification({
  previousTask,
  nextTask,
  campaignId,
  campaignName,
  assignedBy,
}: Omit<AssignmentNotificationParams, 'currentNotifications'>) {
  const wasAssignedTo = previousTask?.assignedToEmail?.toLowerCase() || '';
  const isAssignedTo = nextTask.assignedToEmail?.toLowerCase() || '';
  const assignmentChanged =
    nextTask.assignmentMode === 'person' &&
    isAssignedTo &&
    (previousTask?.assignmentMode !== 'person' || wasAssignedTo !== isAssignedTo);

  if (!assignmentChanged) {
    return null;
  }

  const now = new Date();
  return {
    id: `assign-${campaignId}-${nextTask.id}-${now.getTime()}`,
    type: 'task_assigned',
    taskId: nextTask.id,
    taskName: campaignName,
    taskDescription: nextTask.title,
    assignedTo: isAssignedTo,
    assignedToName: nextTask.assignedToName,
    assignedBy,
    timestamp: now.toISOString(),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    read: false,
  };
}

export function appendAssignmentNotification({
  currentNotifications,
  previousTask,
  nextTask,
  campaignId,
  campaignName,
  assignedBy,
}: AssignmentNotificationParams) {
  const notification = createAssignmentNotification({
    previousTask,
    nextTask,
    campaignId,
    campaignName,
    assignedBy,
  });

  if (!notification) {
    return currentNotifications;
  }

  return [notification, ...currentNotifications];
}
