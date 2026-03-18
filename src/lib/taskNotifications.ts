import type { CampaignTeamTask } from './operations';

interface AssignmentNotificationParams {
  currentNotifications: any[];
  previousTask?: CampaignTeamTask;
  nextTask: CampaignTeamTask;
  campaignId: string;
  campaignName: string;
  assignedBy: string;
}

export function appendAssignmentNotification({
  currentNotifications,
  previousTask,
  nextTask,
  campaignId,
  campaignName,
  assignedBy,
}: AssignmentNotificationParams) {
  const wasAssignedTo = previousTask?.assignedToEmail?.toLowerCase() || '';
  const isAssignedTo = nextTask.assignedToEmail?.toLowerCase() || '';
  const assignmentChanged =
    nextTask.assignmentMode === 'person' &&
    isAssignedTo &&
    (previousTask?.assignmentMode !== 'person' || wasAssignedTo !== isAssignedTo);

  if (!assignmentChanged) {
    return currentNotifications;
  }

  const now = new Date();
  const notification = {
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

  return [notification, ...currentNotifications];
}
