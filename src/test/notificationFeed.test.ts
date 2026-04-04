import { describe, expect, it } from 'vitest';

import {
  buildLatestNotificationFeed,
  formatNotificationFeedTime,
} from '@/lib/notificationFeed';

describe('buildLatestNotificationFeed', () => {
  it('returns latest updates and latest assigned tasks in descending order', () => {
    const feed = buildLatestNotificationFeed({
      organizedUpdates: [
        {
          createdAt: '2026-04-01T10:00:00.000Z',
          id: 'u-1',
          organizedOutput: 'Earlier update',
          rawInput: 'Earlier update',
          sourceLanguage: 'en',
          title: 'Earlier',
          translatedInput: '',
          updatedAt: '2026-04-01T10:00:00.000Z',
        },
        {
          createdAt: '2026-04-04T11:00:00.000Z',
          id: 'u-2',
          organizedOutput: 'Newest update',
          rawInput: 'Newest update',
          sourceLanguage: 'en',
          title: 'Newest',
          translatedInput: '',
          updatedAt: '2026-04-04T11:00:00.000Z',
        },
      ],
      successLogs: [
        {
          detail: 'Fallback update',
          id: 's-1',
          timestamp: '2026-04-03T08:00:00.000Z',
          title: 'Success',
        },
      ],
      taskNotifications: [
        {
          assignedTo: 'member@trygc.com',
          id: 'a-1',
          taskDescription: 'Older assignment',
          taskName: 'Campaign A',
          timestamp: '2026-04-02T09:00:00.000Z',
        },
        {
          assignedTo: 'member@trygc.com',
          id: 'a-2',
          taskDescription: 'Newest assignment',
          taskName: 'Campaign B',
          timestamp: '2026-04-04T12:00:00.000Z',
        },
        {
          assignedTo: 'other@trygc.com',
          id: 'a-3',
          taskDescription: 'Should be filtered out',
          taskName: 'Campaign C',
          timestamp: '2026-04-04T13:00:00.000Z',
        },
      ],
      userEmail: 'member@trygc.com',
    });

    expect(feed.map((item) => item.id)).toEqual([
      'a-2',
      'update-u-2',
      'success-s-1',
      'a-1',
      'update-u-1',
    ]);
  });

  it('caps the number of items returned', () => {
    const feed = buildLatestNotificationFeed({
      maxItems: 2,
      organizedUpdates: [],
      successLogs: [
        { id: 's-1', timestamp: '2026-04-02T08:00:00.000Z', title: 'One' },
        { id: 's-2', timestamp: '2026-04-03T08:00:00.000Z', title: 'Two' },
        { id: 's-3', timestamp: '2026-04-04T08:00:00.000Z', title: 'Three' },
      ],
      taskNotifications: [],
      userEmail: '',
    });

    expect(feed).toHaveLength(2);
    expect(feed[0]?.id).toBe('success-s-3');
    expect(feed[1]?.id).toBe('success-s-2');
  });
});

describe('formatNotificationFeedTime', () => {
  it('falls back gracefully for invalid values', () => {
    expect(formatNotificationFeedTime('')).toBe('Recently');
  });
});
