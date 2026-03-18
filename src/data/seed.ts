import { Campaign, Task, CommunityWorkspace, CampaignIntake, OrganizedUpdate, ShiftHandover, LinkWidget, CoverageRecord, SuccessLog, TaskNotification, MistakeLog, User } from '@/types';

export const seedTeamMembers: User[] = [
  { id: '1', email: 'sara@trygc.com', name: 'Sara Al-Rashid', role: 'owner', features: ['all'], demoCompleted: true, createdAt: '2024-01-01' },
  { id: '2', email: 'ahmed@trygc.com', name: 'Ahmed Hassan', role: 'admin', features: ['campaigns', 'tasks', 'community', 'coverage', 'reports', 'analytics'], demoCompleted: true, createdAt: '2024-02-01' },
  { id: '3', email: 'fatima@trygc.com', name: 'Fatima Noor', role: 'member', features: ['tasks', 'community', 'coverage', 'handover'], demoCompleted: true, createdAt: '2024-03-01' },
  { id: '4', email: 'omar@trygc.com', name: 'Omar Khalil', role: 'member', features: ['tasks', 'community', 'coverage'], demoCompleted: false, createdAt: '2024-04-01' },
  { id: '5', email: 'layla@trygc.com', name: 'Layla Mansour', role: 'admin', features: ['campaigns', 'tasks', 'analytics', 'reports'], demoCompleted: true, createdAt: '2024-03-15' },
];

export const seedCampaigns: Campaign[] = [
  {
    id: 'c1', name: 'Ramadan Mega Campaign', client: 'Al-Marai', phase: 'Live', status: 'Active',
    startDate: '2026-03-01', endDate: '2026-04-15', budget: 450000, description: 'Largest Ramadan influencer activation across GCC markets with 200+ creators.',
    teamPlan: [
      { team: 'Inbound', tasks: ['Process all incoming applications', 'Vet influencer profiles'], lead: 'Fatima Noor' },
      { team: 'Outbound', tasks: ['Reach out to top-tier creators', 'Negotiate rates'], lead: 'Omar Khalil' },
      { team: 'Coverage', tasks: ['Track all content submissions', 'QC posted content'], lead: 'Ahmed Hassan' },
      { team: 'Coordination', tasks: ['Daily standups', 'Client updates', 'Timeline management'], lead: 'Sara Al-Rashid' },
    ],
    createdAt: '2026-02-15', updatedAt: '2026-03-13',
  },
  {
    id: 'c2', name: 'Summer Beauty Launch', client: 'Huda Beauty', phase: 'Planning', status: 'Planning',
    startDate: '2026-06-01', endDate: '2026-07-15', budget: 280000, description: 'Product launch campaign for new summer collection across UAE and KSA.',
    teamPlan: [
      { team: 'Acquisition', tasks: ['Build influencer shortlist', 'Identify key accounts'] },
      { team: 'Quality', tasks: ['Define content guidelines', 'Create brief templates'] },
    ],
    createdAt: '2026-03-01', updatedAt: '2026-03-10',
  },
  {
    id: 'c3', name: 'Eid Celebration Push', client: 'Careem', phase: 'Briefing', status: 'Active',
    startDate: '2026-04-01', endDate: '2026-04-20', budget: 180000, description: 'Eid-themed ride and delivery service promotion.',
    teamPlan: [
      { team: 'WhatsApp Live Chat', tasks: ['Manage influencer queries', 'Send briefs via WhatsApp'] },
      { team: 'Post-Campaign', tasks: ['Collect performance data', 'Generate reports'] },
    ],
    createdAt: '2026-02-20', updatedAt: '2026-03-12',
  },
  {
    id: 'c4', name: 'Tech Showcase Q2', client: 'Samsung MENA', phase: 'Post-Campaign', status: 'Completed',
    startDate: '2026-01-15', endDate: '2026-02-28', budget: 520000, description: 'Galaxy S26 launch with unboxing and review campaigns.',
    teamPlan: [
      { team: 'Key Accounts', tasks: ['Manage VIP creators', 'Exclusive preview events'] },
      { team: 'Analytics', tasks: ['Track engagement metrics', 'ROI analysis'] },
    ],
    createdAt: '2025-12-01', updatedAt: '2026-03-05',
  },
];

export const seedTasks: Task[] = [
  { id: 't1', title: 'Finalize Ramadan creator list', description: 'Complete the final list of 200+ creators for Ramadan campaign', criteria: 'All creators vetted and approved', methodology: 'Cross-reference with past performance data', status: 'In Progress', priority: 'Critical', dueDate: '2026-03-14', assignmentMode: 'team', assignedTeam: 'Inbound', campaignId: 'c1', notes: '180/200 confirmed', createdAt: '2026-03-01', updatedAt: '2026-03-13' },
  { id: 't2', title: 'Send Ramadan briefs batch 3', description: 'Send campaign briefs to batch 3 influencers', criteria: 'All 50 briefs sent and acknowledged', methodology: 'WhatsApp broadcast + email', status: 'Pending', priority: 'High', dueDate: '2026-03-15', assignmentMode: 'person', assignedPerson: 'Fatima Noor', campaignId: 'c1', notes: '', createdAt: '2026-03-10', updatedAt: '2026-03-13' },
  { id: 't3', title: 'QC Day 5 content submissions', description: 'Review all content submitted on Day 5 of the campaign', criteria: 'All content checked for brand compliance', methodology: 'Manual review with QC checklist', status: 'Blocked', priority: 'High', dueDate: '2026-03-13', assignmentMode: 'team', assignedTeam: 'Quality', campaignId: 'c1', notes: 'Waiting on 12 creators to resubmit', createdAt: '2026-03-12', updatedAt: '2026-03-13' },
  { id: 't4', title: 'Build Summer Beauty shortlist', description: 'Create shortlist of 100 beauty influencers for Huda Beauty campaign', criteria: 'Minimum 50k followers, beauty niche, GCC-based', methodology: 'Database search + manual curation', status: 'Pending', priority: 'Medium', dueDate: '2026-03-20', assignmentMode: 'team', assignedTeam: 'Acquisition', campaignId: 'c2', notes: '', createdAt: '2026-03-05', updatedAt: '2026-03-10' },
  { id: 't5', title: 'Samsung final report', description: 'Generate final performance report for Samsung campaign', criteria: 'Include all KPIs, ROI, and recommendations', methodology: 'Data export + analysis template', status: 'In Progress', priority: 'Medium', dueDate: '2026-03-16', assignmentMode: 'person', assignedPerson: 'Layla Mansour', campaignId: 'c4', notes: 'Draft 80% complete', createdAt: '2026-03-01', updatedAt: '2026-03-12' },
  { id: 't6', title: 'Daily Ops standup notes', description: 'Document and distribute daily standup notes', criteria: 'Shared within 30 minutes of meeting', methodology: 'Live notes during meeting', status: 'Done', priority: 'Low', dueDate: '2026-03-13', assignmentMode: 'person', assignedPerson: 'Ahmed Hassan', notes: 'Shared at 10:30 AM', createdAt: '2026-03-13', updatedAt: '2026-03-13' },
  { id: 't7', title: 'Careem brief review', description: 'Review and approve Eid campaign brief before distribution', criteria: 'Client-approved, brand-compliant', methodology: 'Internal review + client sign-off', status: 'In Progress', priority: 'High', dueDate: '2026-03-14', assignmentMode: 'team', assignedTeam: 'Coordination', campaignId: 'c3', notes: 'Client requested minor changes', createdAt: '2026-03-08', updatedAt: '2026-03-13' },
  { id: 't8', title: 'Update WhatsApp templates', description: 'Update all WhatsApp message templates for Eid campaign', criteria: 'Templates approved by team lead', methodology: 'Template builder', status: 'Pending', priority: 'Medium', dueDate: '2026-03-17', assignmentMode: 'team', assignedTeam: 'WhatsApp Live Chat', campaignId: 'c3', notes: '', createdAt: '2026-03-11', updatedAt: '2026-03-11' },
];

export const seedCommunityWorkspaces: CommunityWorkspace[] = [
  {
    country: 'Saudi Arabia', manager: 'Ahmed Hassan', summary: 'Largest market. 450 active influencers. Focus on Ramadan activations.',
    progress: 72,
    tasks: [
      { id: 'ct1', name: 'Add New Influencers', status: 'In Progress', assignee: 'Ahmed Hassan', notes: '25 new profiles this week', updatedAt: '2026-03-13' },
      { id: 'ct2', name: 'Calling Influencers', status: 'Done', assignee: 'Fatima Noor', notes: 'All 40 calls completed', updatedAt: '2026-03-13' },
      { id: 'ct3', name: 'Check Campaign Status', status: 'In Progress', notes: 'Reviewing 3 active campaigns', updatedAt: '2026-03-13' },
      { id: 'ct4', name: 'Reply on All WhatsApp', status: 'Pending', notes: '12 unread messages', updatedAt: '2026-03-12' },
      { id: 'ct5', name: 'Daily Ops Meeting', status: 'Done', notes: 'Completed at 9:00 AM', updatedAt: '2026-03-13' },
    ],
  },
  {
    country: 'United Arab Emirates', manager: 'Layla Mansour', summary: 'Premium market. 280 active influencers. High-value campaigns.',
    progress: 85,
    tasks: [
      { id: 'ct6', name: 'Check Confirmations', status: 'Done', assignee: 'Layla Mansour', notes: 'All confirmed for Huda Beauty', updatedAt: '2026-03-13' },
      { id: 'ct7', name: 'Generate New Leads', status: 'In Progress', notes: 'Targeting luxury segment', updatedAt: '2026-03-12' },
      { id: 'ct8', name: 'Quotations Sent', status: 'Done', notes: '15 quotations sent today', updatedAt: '2026-03-13' },
      { id: 'ct9', name: 'Create Brief', status: 'Pending', notes: 'For Summer Beauty Launch', updatedAt: '2026-03-11' },
    ],
  },
  {
    country: 'Kuwait', manager: 'Omar Khalil', summary: 'Growing market. 120 active influencers. Focus on food and lifestyle.',
    progress: 60,
    tasks: [
      { id: 'ct10', name: 'Generate New List', status: 'In Progress', assignee: 'Omar Khalil', notes: 'Food niche expansion', updatedAt: '2026-03-13' },
      { id: 'ct11', name: 'Check Missing Coverage', status: 'Pending', notes: '8 missing submissions', updatedAt: '2026-03-12' },
      { id: 'ct12', name: 'Update Ongoing Report', status: 'Pending', notes: '', updatedAt: '2026-03-10' },
    ],
  },
  {
    country: 'Egypt', manager: 'Fatima Noor', summary: 'Highest volume market. 600+ influencers. Budget-conscious campaigns.',
    progress: 48,
    tasks: [
      { id: 'ct13', name: 'Add New Influencers', status: 'In Progress', assignee: 'Fatima Noor', notes: '50 new profiles pending review', updatedAt: '2026-03-13' },
      { id: 'ct14', name: 'Campaign Report Review', status: 'Blocked', notes: 'Waiting on analytics data', updatedAt: '2026-03-12' },
      { id: 'ct15', name: 'Client Meeting', status: 'Pending', notes: 'Scheduled for March 15', updatedAt: '2026-03-11' },
      { id: 'ct16', name: 'Create A Plan', status: 'In Progress', notes: 'Q2 activation plan', updatedAt: '2026-03-13' },
    ],
  },
];

export const seedCampaignIntakes: CampaignIntake[] = [
  { id: 'ci1', campaignName: 'Fitness App Launch', clientName: 'FitMe Arabia', startDate: '2026-04-15', endDate: '2026-05-15', budget: '95000', objectives: 'App downloads and user registration across GCC', notes: 'Focus on fitness and wellness influencers', createdAt: '2026-03-12' },
];

export const seedUpdates: OrganizedUpdate[] = [
  { id: 'u1', rawText: 'ramadan campaign day 5 update - 45 posts live, 12 pending review, engagement rate 4.2% above benchmark', formattedText: '**Ramadan Campaign Day 5 Update**\n- 45 posts live\n- 12 pending review\n- Engagement rate: 4.2% (above benchmark)', category: 'Campaign Update', createdAt: '2026-03-13' },
  { id: 'u2', rawText: 'client approved the eid brief, moving to activation phase tomorrow, need to notify all teams', formattedText: '**Eid Brief Approved**\n- Client has approved the Eid campaign brief\n- Moving to activation phase tomorrow\n- Action: Notify all teams', category: 'Client Update', createdAt: '2026-03-12' },
];

export const seedHandovers: ShiftHandover[] = [
  { id: 'h1', shiftDate: '2026-03-13', author: 'Ahmed Hassan',
    completedTasks: ['Processed 30 inbound applications', 'Sent briefs to batch 2 creators', 'Updated Ramadan tracker'],
    pendingTasks: ['12 WhatsApp messages need replies', 'QC review for Day 5 content', 'Client call at 2 PM'],
    escalations: ['Creator @lifestyle_queen missed deadline - needs follow-up', 'Budget approval needed for additional 10 creators'],
    notes: 'Overall good day. Ramadan campaign on track. Eid campaign brief approved.', broadcastSummary: '📋 Shift Handover - March 13\n\n✅ Done: 30 apps processed, briefs sent, tracker updated\n⏳ Pending: 12 WhatsApp replies, QC review, client call\n🚨 Escalations: Missed deadline (@lifestyle_queen), budget approval needed\n📝 Notes: Good day overall, campaigns on track.',
    createdAt: '2026-03-13' },
];

export const seedWidgets: LinkWidget[] = [
  { id: 'w1', title: 'Campaign Tracker', url: 'https://docs.google.com/spreadsheets/d/example1', category: 'Trackers', color: 'zinc', pinned: true, createdAt: '2026-01-15' },
  { id: 'w2', title: 'Influencer Database', url: 'https://docs.google.com/spreadsheets/d/example2', category: 'Databases', color: 'zinc', pinned: true, createdAt: '2026-01-15' },
  { id: 'w3', title: 'Brand Guidelines', url: 'https://drive.google.com/example3', category: 'Resources', color: 'zinc', pinned: false, createdAt: '2026-02-01' },
  { id: 'w4', title: 'Content Calendar', url: 'https://notion.so/example4', category: 'Planning', color: 'zinc', pinned: true, createdAt: '2026-02-15' },
  { id: 'w5', title: 'Performance Dashboard', url: 'https://analytics.example.com', category: 'Analytics', color: 'zinc', pinned: false, createdAt: '2026-03-01' },
  { id: 'w6', title: 'SOP Documents', url: 'https://drive.google.com/sop', category: 'Resources', color: 'zinc', pinned: true, createdAt: '2026-01-10' },
];

export const seedCoverageRecords: CoverageRecord[] = [
  { id: 'cv1', influencer: 'Nora Al-Sayed', platform: 'Instagram', campaignId: 'c1', campaignName: 'Ramadan Mega Campaign', status: 'Approved', link: 'https://instagram.com/p/example1', notes: 'Story + Reel posted', submittedAt: '2026-03-12', createdAt: '2026-03-10' },
  { id: 'cv2', influencer: 'Khalid Bin Fahd', platform: 'TikTok', campaignId: 'c1', campaignName: 'Ramadan Mega Campaign', status: 'Submitted', link: 'https://tiktok.com/@example2', notes: 'Awaiting QC review', submittedAt: '2026-03-13', createdAt: '2026-03-11' },
  { id: 'cv3', influencer: 'Mariam Hussain', platform: 'Snapchat', campaignId: 'c1', campaignName: 'Ramadan Mega Campaign', status: 'Pending', notes: 'Brief sent, awaiting content', createdAt: '2026-03-08' },
  { id: 'cv4', influencer: 'Yousef Al-Khatib', platform: 'YouTube', campaignId: 'c1', campaignName: 'Ramadan Mega Campaign', status: 'Rejected', link: 'https://youtube.com/watch?v=example', notes: 'Brand logo not visible, needs reshoot', submittedAt: '2026-03-12', createdAt: '2026-03-09' },
  { id: 'cv5', influencer: 'Dana Qasim', platform: 'Instagram', campaignId: 'c3', campaignName: 'Eid Celebration Push', status: 'Pending', notes: 'In briefing phase', createdAt: '2026-03-10' },
  { id: 'cv6', influencer: 'Reem Al-Otaibi', platform: 'TikTok', campaignId: 'c1', campaignName: 'Ramadan Mega Campaign', status: 'Approved', link: 'https://tiktok.com/@example6', notes: 'Excellent engagement', submittedAt: '2026-03-11', createdAt: '2026-03-08' },
];

export const seedSuccessLogs: SuccessLog[] = [
  { id: 's1', title: 'Ramadan Day 3 hit 1M impressions', description: 'The Ramadan campaign crossed 1 million impressions on Day 3, ahead of the Day 5 target.', campaignId: 'c1', author: 'Ahmed Hassan', createdAt: '2026-03-11' },
  { id: 's2', title: 'Samsung campaign ROI exceeded 340%', description: 'Final report shows Samsung tech showcase delivered 340% ROI, highest in company history.', campaignId: 'c4', author: 'Layla Mansour', createdAt: '2026-03-05' },
  { id: 's3', title: 'New record: 50 briefs sent in one day', description: 'Outbound team set a new daily record by sending 50 campaign briefs in a single shift.', author: 'Omar Khalil', createdAt: '2026-03-09' },
];

export const seedNotifications: TaskNotification[] = [
  { id: 'n1', type: 'overdue', title: 'Task Overdue', message: 'QC Day 5 content submissions is past due', read: false, taskId: 't3', createdAt: '2026-03-13' },
  { id: 'n2', type: 'done', title: 'Task Completed', message: 'Daily Ops standup notes marked as done', read: false, taskId: 't6', createdAt: '2026-03-13' },
  { id: 'n3', type: 'success', title: 'New Win', message: 'Ramadan Day 3 hit 1M impressions!', read: true, createdAt: '2026-03-11' },
  { id: 'n4', type: 'blocked', title: 'Task Blocked', message: 'QC Day 5 content - waiting on 12 creators', read: false, taskId: 't3', createdAt: '2026-03-13' },
  { id: 'n5', type: 'assigned', title: 'New Assignment', message: 'You have been assigned: Send Ramadan briefs batch 3', read: false, taskId: 't2', createdAt: '2026-03-13' },
];

export const seedMistakes: MistakeLog[] = [
  { id: 'm1', title: 'Wrong brief sent to 5 creators', description: 'Outdated brief version was sent to 5 creators in batch 2. Correct brief resent within 2 hours.', campaignId: 'c1', team: 'Outbound', severity: 'High', resolved: true, resolution: 'Resent correct briefs and confirmed receipt with all 5 creators', createdAt: '2026-03-10', resolvedAt: '2026-03-10' },
  { id: 'm2', title: 'Missing coverage tracking for 3 creators', description: 'Three creators posted content but were not tracked in the coverage sheet.', campaignId: 'c1', team: 'Coverage', severity: 'Medium', resolved: false, createdAt: '2026-03-12' },
];
