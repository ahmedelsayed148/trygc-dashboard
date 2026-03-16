import React, { useState } from 'react';
import { X, Gift, MessageCircle, Folder, Link2, Star, Settings as SettingsIcon, Flame, Users } from 'lucide-react';

interface SOPModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Department = 'onboarding' | 'livechat' | 'coverage' | 'coordination' | 'quality' | 'systems' | 'activation' | 'accountmanagers';

const DEPARTMENTS = [
  { id: 'onboarding' as Department, label: 'Onboarding', icon: Gift },
  { id: 'livechat' as Department, label: 'Live Chat', icon: MessageCircle },
  { id: 'coverage' as Department, label: 'Coverage', icon: Folder },
  { id: 'coordination' as Department, label: 'Coordination', icon: Link2 },
  { id: 'quality' as Department, label: 'Quality', icon: Star },
  { id: 'systems' as Department, label: 'Systems', icon: SettingsIcon },
  { id: 'activation' as Department, label: 'Activation', icon: Flame },
  { id: 'accountmanagers' as Department, label: 'Account Managers', icon: Users },
];

export function SOPModal({ isOpen, onClose }: SOPModalProps) {
  const [activeTab, setActiveTab] = useState<Department>('onboarding');

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'onboarding':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Overview</h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Manage the complete client onboarding journey from contract signing to account activation, ensuring smooth setup and initial training across Egypt and GCC markets.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Key Responsibilities</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Welcome new clients and conduct kickoff calls (English/Arabic)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Collect required assets: logos, brand guidelines, access credentials</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Set up client accounts in all platforms (social media, ad accounts, analytics)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Configure tracking pixels, UTM parameters, and conversion tracking</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Create initial content calendars and campaign strategies</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Conduct platform training sessions for client teams</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Document client preferences, tone of voice, and approval workflows</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Handover to operational teams with complete briefing documents</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">KPIs</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Onboarding Completion Time:</span>
                  <span>Under 5 business days</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Client Training Satisfaction:</span>
                  <span>90%+ rating</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Asset Collection Rate:</span>
                  <span>100% within 48 hours</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">First Campaign Launch:</span>
                  <span>Within 7 days of contract</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Handover Documentation:</span>
                  <span>100% complete before transfer</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Client Response Time:</span>
                  <span>Under 4 hours</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Tools & Platforms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Project Management</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Asana, Monday.com</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Documentation</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Google Workspace, Notion</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Communication</p>
                  <p className="text-zinc-600 dark:text-zinc-400">WhatsApp Business, Zoom, Teams</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Social Platforms</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Meta, TikTok, Snapchat</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Training</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Loom for video tutorials</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Daily Workflow</h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">Morning</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Review new contracts, schedule kickoff calls, prepare onboarding checklists</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">During Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Conduct client meetings, collect assets, set up accounts, create documentation</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">End of Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Update onboarding tracker, schedule next steps, communicate with account managers</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Escalation Procedures</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Missing assets after 2 reminders → Escalate to Account Manager</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Technical setup issues → Systems team support ticket</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Client unresponsive for 3+ days → Escalate to Sales Manager</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Special platform requirements → Consult with Media Buying team</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Best Practices</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Use bilingual onboarding materials for GCC clients</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Create personalized welcome videos for each client</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Set clear expectations on timelines and deliverables upfront</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Maintain detailed notes on client preferences and restrictions</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Schedule follow-up check-ins at 7, 14, and 30 days post-launch</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Celebrate successful launches with client appreciation messages</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'livechat':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Overview</h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Provide real-time customer support and engagement through social media messaging, responding to inquiries, resolving issues, and maintaining brand voice across all platforms.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Key Responsibilities</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Monitor and respond to messages across Facebook, Instagram, WhatsApp, TikTok</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Answer product inquiries, pricing questions, and service details</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Resolve customer complaints and technical issues in real-time</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Escalate complex issues to appropriate departments</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Track conversation metrics and response times</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Maintain brand voice and tone in all interactions (English/Arabic)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Document frequently asked questions for knowledge base</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Coordinate with sales team on qualified leads</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">KPIs</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Average Response Time:</span>
                  <span>Under 3 minutes during business hours</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">First Contact Resolution Rate:</span>
                  <span>75%+</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Customer Satisfaction Score (CSAT):</span>
                  <span>4.5/5 or higher</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Messages Handled per Hour:</span>
                  <span>15-20 conversations</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Escalation Rate:</span>
                  <span>Below 10%</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Response Accuracy:</span>
                  <span>95%+ (no incorrect information)</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Tools & Platforms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Social Messaging</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Meta Business Suite, WhatsApp API</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">CRM</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Zendesk, Intercom, Freshdesk</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Knowledge Base</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Notion, Confluence</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Translation</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Google Translate</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Monitoring</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Sprout Social, Hootsuite</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Daily Workflow</h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">Morning</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Review overnight messages, check escalated tickets, review product updates</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">During Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Active monitoring, real-time responses, escalation handling, CRM updates</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">End of Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Handover notes to next shift, update response templates, report metrics</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Escalation Procedures</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Refund requests over $500 → Finance Manager approval</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Technical bugs or system errors → Systems team ticket</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Angry customers (CSAT 1-2 stars) → Customer Service Manager</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Sales inquiries over $10K → Direct to Sales team</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Legal or compliance questions → Legal department</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Best Practices</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Use customer's name and personalize responses</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Respond with empathy first, solution second</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Keep responses concise and actionable (under 100 words)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Use emojis appropriately to maintain friendly tone</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Always end with "Is there anything else I can help with?"</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Save complex answers as templates for faster responses</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'coverage':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Overview</h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Monitor brand mentions, competitor activities, and industry trends across social media and digital platforms to provide actionable insights and crisis prevention for clients.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Key Responsibilities</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Track brand mentions, hashtags, and tagged content across platforms</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Monitor competitor campaigns, content strategies, and audience engagement</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Identify trending topics and viral content relevant to client industries</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Alert teams to potential PR crises or negative sentiment</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Compile daily/weekly coverage reports with screenshots and analytics</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Analyze share of voice compared to competitors</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Identify influencer partnerships and brand collaborations in the market</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Provide trend recommendations for content and campaign strategies</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">KPIs</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Coverage Reports Delivered:</span>
                  <span>Daily by 10 AM</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Sentiment Analysis Accuracy:</span>
                  <span>90%+</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Crisis Detection Speed:</span>
                  <span>Within 30 minutes of escalation</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Competitor Tracking:</span>
                  <span>Minimum 5 competitors per client</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Trend Identification:</span>
                  <span>3-5 relevant trends per week</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Report Turnaround Time:</span>
                  <span>Under 2 hours for urgent requests</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Tools & Platforms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Social Listening</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Brandwatch, Mention, Talkwalker</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Analytics</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Socialbakers, Rival IQ, Sprout Social</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Screenshot Tools</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Lightshot, Snagit</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Reporting</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Google Data Studio, Tableau</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Trend Tracking</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Google Trends, TikTok Creative Center</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Daily Workflow</h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">Morning</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Scan overnight mentions, check trending topics, prepare daily coverage digest</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">During Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Continuous monitoring, screenshot collection, competitor analysis, alert distribution</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">End of Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Compile end-of-day report, schedule next-day monitoring priorities</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Escalation Procedures</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Negative viral content (1K+ engagements) → Immediate alert to Account Manager</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Fake accounts or impersonation → Report to Systems and Legal teams</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Industry crisis affecting multiple clients → Alert all Account Managers</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Positive PR opportunities → Share with Content and Social Media teams</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Competitor launching similar campaigns → Notify Media Buying team</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Best Practices</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Set up custom alerts for brand name variations and common misspellings</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Create competitor tracking dashboards updated in real-time</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Use sentiment analysis tools to categorize mentions (positive/neutral/negative)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Archive all coverage with timestamps for legal protection</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Provide context with every alert (not just screenshots)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Build industry-specific keyword lists for each client</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'coordination':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Overview</h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Act as the central hub connecting all departments, ensuring seamless communication, deadline tracking, and project alignment for multi-team campaigns and client deliverables.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Key Responsibilities</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Facilitate communication between departments (Design, Content, Media Buying, etc.)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Track project timelines and ensure deadline compliance across teams</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Organize daily standup meetings and weekly planning sessions</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Manage shared calendars for campaign launches and content schedules</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Resolve cross-departmental conflicts and resource allocation issues</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Maintain central project documentation and status updates</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Coordinate urgent requests and prioritize workload distribution</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Ensure all stakeholders are informed of changes and updates</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">KPIs</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Project Deadline Achievement:</span>
                  <span>95%+ on-time delivery</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Meeting Efficiency:</span>
                  <span>All standups under 15 minutes</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Cross-Department Response Time:</span>
                  <span>Under 1 hour</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Documentation Accuracy:</span>
                  <span>100% up-to-date project statuses</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Conflict Resolution Time:</span>
                  <span>Under 4 hours for escalations</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Stakeholder Satisfaction:</span>
                  <span>4.5/5 from all departments</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Tools & Platforms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Project Management</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Asana, Monday.com, Trello, ClickUp</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Communication</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Slack, Microsoft Teams, WhatsApp</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Calendars</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Google Calendar, Outlook</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Documentation</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Notion, Confluence, Google Workspace</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Time Tracking</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Toggl, Harvest</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Daily Workflow</h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">Morning</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Review all project statuses, send priority list to teams, confirm day's deadlines</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">During Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Monitor task progress, facilitate handoffs, resolve blockers, update stakeholders</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">End of Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Compile end-of-day status report, confirm next-day priorities, handover urgent items</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Escalation Procedures</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Missed deadlines impacting client launch → Immediate Account Manager alert</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Team capacity overload → Escalate to Operations Manager for resource reallocation</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Inter-department conflicts → Mediate first, escalate to Head of Department if unresolved</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Client-requested rush jobs → Assess feasibility, get approvals before committing</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>System/tool downtime affecting multiple teams → Alert Systems and leadership</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Best Practices</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Use color-coded priority systems (Red: Urgent, Yellow: Important, Green: Routine)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Send daily digest emails to all teams by 9 AM with priorities</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Create project templates for recurring campaign types</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Maintain a "single source of truth" document for each project</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Over-communicate rather than under-communicate on deadline changes</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Celebrate team wins and recognize cross-departmental collaboration</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'quality':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Overview</h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Ensure all client deliverables meet brand standards, platform requirements, and quality benchmarks through comprehensive review processes and feedback loops before publication.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Key Responsibilities</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Review all content (graphics, copy, videos) before client approval or publication</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Check brand consistency: logos, colors, fonts, tone of voice</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Verify technical requirements: image dimensions, video formats, character limits</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Proofread for grammar, spelling, and translation accuracy (English/Arabic)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Test all links, CTAs, and interactive elements for functionality</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Ensure compliance with platform policies (Meta, TikTok, Google)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Provide constructive feedback to creators with improvement suggestions</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Maintain quality checklists and approval workflows</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">KPIs</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Review Turnaround Time:</span>
                  <span>Under 2 hours for standard requests</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Error Detection Rate:</span>
                  <span>Catch 95%+ of errors before client sees content</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Client Revision Requests:</span>
                  <span>Below 10% (indicating high first-pass quality)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Platform Rejection Rate:</span>
                  <span>Under 2% for ad content</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Quality Score:</span>
                  <span>4.8/5 from internal teams and clients</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Compliance Accuracy:</span>
                  <span>100% adherence to platform policies</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Tools & Platforms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Grammar & Spelling</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Grammarly, Hemingway Editor</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Brand Compliance</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Style guides, asset libraries</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Checklists</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Notion, Asana task templates</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Collaboration</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Frame.io, Figma for feedback</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Translation</p>
                  <p className="text-zinc-600 dark:text-zinc-400">DeepL, Google Translate</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Daily Workflow</h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">Morning</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Review queue of pending deliverables, prioritize by client launch dates</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">During Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Content review cycles, provide feedback, re-review after revisions</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">End of Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Approve finalized content, update approval logs, flag recurring issues</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Escalation Procedures</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Content violating platform policies → Block publication, alert creator and Account Manager</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Brand guideline violations → Return to creator with specific corrections needed</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Offensive or culturally insensitive content → Immediate escalation to department head</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Repeated errors from same creator → Alert to team lead for training</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Client-requested content that violates policies → Educate client, suggest alternatives</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Best Practices</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Use standardized quality checklists for each content type (static, video, carousel)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Provide specific feedback with examples, not just "redo this"</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Keep a library of approved vs. rejected examples for training</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Double-check Arabic text direction and formatting (RTL)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Test mobile and desktop previews for all visual content</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Maintain updated platform specification sheets (latest ad sizes, video lengths)</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'systems':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Overview</h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Manage technical infrastructure, platform integrations, automation tools, and troubleshoot system issues to ensure smooth operations across all tools and client accounts.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Key Responsibilities</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Set up and maintain integrations between platforms (CRM, social media, analytics)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Troubleshoot technical issues with ad accounts, pixels, tracking codes</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Build automation workflows for reporting, data collection, and task management</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Manage user permissions and access control across all platforms</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Monitor system performance and uptime for critical tools</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Create and maintain technical documentation and SOPs</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Train teams on new tools and platform updates</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Implement security protocols and data protection measures</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">KPIs</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">System Uptime:</span>
                  <span>99.5%+ for critical platforms</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Issue Resolution Time:</span>
                  <span>Under 4 hours for P1, under 24 hours for P2</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Automation Success Rate:</span>
                  <span>95%+ workflows running without errors</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Security Incidents:</span>
                  <span>Zero breaches or unauthorized access</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Tool Adoption Rate:</span>
                  <span>90%+ team usage of deployed systems</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Documentation Coverage:</span>
                  <span>100% of systems with current SOPs</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Tools & Platforms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Integration</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Zapier, Make, API connections</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Tracking</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Google Tag Manager, Meta Pixel</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Automation</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Python scripts, Google Apps Script</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Security</p>
                  <p className="text-zinc-600 dark:text-zinc-400">LastPass, 1Password, 2FA</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Monitoring</p>
                  <p className="text-zinc-600 dark:text-zinc-400">UptimeRobot, Pingdom</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Documentation</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Notion, Confluence, GitHub</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Daily Workflow</h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">Morning</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Check system health dashboards, review overnight error logs, prioritize tickets</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">During Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Respond to support tickets, implement new integrations, update automations</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">End of Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Document completed work, schedule maintenance windows, handover critical issues</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Escalation Procedures</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Platform-wide outages (Meta, Google) → Notify all teams, create workaround plan</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Data breach or security incident → Immediate escalation to leadership and legal</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Client account access issues before campaign launch → Priority 1, resolve immediately</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Budget overspend due to system error → Alert Finance and Account Managers</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Third-party API failures → Contact vendor support, implement backup solution</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Best Practices</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Always test integrations in sandbox/staging before production</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Maintain backup access methods for all critical accounts</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Document every technical change in a change log with timestamps</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Use version control for all automation scripts and code</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Schedule regular security audits and password rotations (quarterly)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Create runbooks for common issues with step-by-step solutions</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'activation':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Overview</h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Drive campaign launches, promotional activations, and product launches with urgency and precision, ensuring all elements are live and optimized for maximum impact on launch day.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Key Responsibilities</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Coordinate go-live timing for campaigns across multiple platforms simultaneously</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Verify all campaign elements are active: ads, landing pages, tracking, budgets</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Monitor first-hour performance and make rapid optimizations</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Troubleshoot launch issues in real-time (rejected ads, payment failures, broken links)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Communicate launch status to all stakeholders with live updates</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Activate promotional codes, discounts, and special offers</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Coordinate with influencers and partners for synchronized posting</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Document launch learnings and optimize activation processes</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">KPIs</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">On-Time Launch Rate:</span>
                  <span>98%+ campaigns go live at scheduled time</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">First-Hour Issue Resolution:</span>
                  <span>100% of blockers cleared within 60 minutes</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Launch Day Performance:</span>
                  <span>90%+ of campaigns meet Day 1 targets</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Activation Checklist Completion:</span>
                  <span>100% pre-launch verification</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Stakeholder Communication:</span>
                  <span>Real-time updates every 30 minutes during launch</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Post-Launch Report Delivery:</span>
                  <span>Within 24 hours of activation</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Tools & Platforms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Ad Platforms</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Meta Ads, Google Ads, TikTok, Snapchat</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Analytics</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Google Analytics, native analytics</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Communication</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Slack war rooms, WhatsApp groups</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Monitoring</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Real-time dashboards, automated alerts</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Checklists</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Asana, Monday.com launch templates</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Daily Workflow</h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">Morning</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Review day's scheduled launches, confirm all assets ready, run pre-flight checks</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">During Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Execute launches, monitor performance, rapid response to issues</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">End of Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Compile launch reports, schedule optimization reviews, handover ongoing monitoring</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Escalation Procedures</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Ad account suspended during launch → Immediate appeal + backup account activation</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Payment method declined → Contact Finance for emergency payment method</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Landing page down or broken → Alert Web Development + activate backup URL</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Performance 50% below target in first 3 hours → Notify Media Buying for strategy pivot</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Client requested emergency pause → Execute immediately, document reason</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Best Practices</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Conduct "dress rehearsal" 24 hours before major launches</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Use launch checklists with time-based triggers (T-60min, T-30min, T-0)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Have backup creatives pre-approved in case of ad rejections</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Set up automated alerts for budget depletion, link errors, conversion drops</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Create war room channels for launches over $10K budgets</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Celebrate successful launches with team shoutouts</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'accountmanagers':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Overview</h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Serve as the primary client liaison, managing relationships, strategic planning, performance reporting, and ensuring client satisfaction and retention across all service deliverables.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Key Responsibilities</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Act as main point of contact for assigned client accounts</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Conduct weekly/monthly strategy calls and performance reviews</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Present analytics reports with insights and optimization recommendations</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Manage client expectations, timelines, and budget allocations</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Identify upsell opportunities for additional services or budget increases</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Resolve client concerns and coordinate internal teams for solutions</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Negotiate contract renewals and service expansions</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                  <span>Maintain detailed account documentation and communication history</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">KPIs</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Client Retention Rate:</span>
                  <span>90%+ annual retention</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Client Satisfaction (NPS):</span>
                  <span>8+ Net Promoter Score</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Revenue Growth:</span>
                  <span>15%+ account value increase year-over-year</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Upsell Success Rate:</span>
                  <span>25%+ of clients expand services</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Response Time:</span>
                  <span>Under 2 hours for client inquiries</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Monthly Reporting:</span>
                  <span>100% on-time delivery with actionable insights</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Tools & Platforms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">CRM</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Salesforce, HubSpot</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Reporting</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Google Data Studio, Tableau, Supermetrics</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Presentations</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Google Slides, PowerPoint, Canva</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Communication</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Email, WhatsApp Business, Zoom, Teams</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Contracts</p>
                  <p className="text-zinc-600 dark:text-zinc-400">DocuSign, PandaDoc</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Daily Workflow</h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">Morning</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Review client performance dashboards, respond to overnight messages, plan day's calls</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">During Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Client meetings, report preparation, internal coordination, strategy development</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">End of Shift</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">Send follow-up emails, update CRM notes, prepare next-day agenda</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Escalation Procedures</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Client threatens to cancel contract → Immediate escalation to Sales Director</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Performance below 70% of agreed KPIs → Create recovery plan with Media Buying team</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Client requests services outside scope → Consult with department heads for feasibility</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Budget disputes or invoice issues → Involve Finance Manager</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-red-600 dark:text-red-400 font-bold">→</span>
                  <span>Negative feedback about team member → Address with department lead privately</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-3">Best Practices</h3>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Schedule regular check-ins even when performance is excellent (proactive communication)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Use data storytelling in reports—show trends, insights, not just numbers</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Celebrate client wins publicly (social media shoutouts, case studies)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Maintain a "client preference sheet" (communication style, decision-makers, no-go topics)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Send monthly industry insights even if not directly related to current campaigns</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>Always have 3 optimization recommendations ready for every client call</span>
                </li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[90vw] max-w-[1000px] h-[85vh] bg-white dark:bg-zinc-950 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">SOP & Role Descriptions</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Grand Community Operations Structure - الهيكل الكامل للمسؤوليات
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max py-2">
            {DEPARTMENTS.map((dept) => {
              const Icon = dept.icon;
              const isActive = activeTab === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => setActiveTab(dept.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-t-lg font-bold text-sm transition-all min-h-[48px] whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{dept.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
