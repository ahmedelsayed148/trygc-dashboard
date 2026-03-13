import React, { useState, useContext } from 'react';
import { useNavigate } from '../lib/routerCompat';
import { AppContext } from './Root';
import { apiRequest } from '../lib/api';
import {
  Sparkles,
  LayoutDashboard,
  ClipboardList,
  Target,
  Layers,
  AlertTriangle,
  Trophy,
  BarChart3,
  Users,
  Settings,
  Upload,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  Zap,
  FileText,
  Globe,
  Eye,
  Download,
  Archive,
  Loader2,
  User,
} from 'lucide-react';

interface DemoStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  path?: string;
  color: string;
}

export function PlatformDemo() {
  const ctx = useContext(AppContext);
  const navigate = useNavigate();
  const isAdmin = ctx?.isAdmin;
  const userName = ctx?.userName || '';
  const userEmail = ctx?.userEmail || '';

  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const adminSteps: DemoStep[] = [
    {
      id: 1,
      title: 'Welcome to the Campaign Dashboard',
      description: 'Your central hub for managing campaigns, tracking team performance, and monitoring real-time progress across all operations.',
      icon: LayoutDashboard,
      features: [
        'Real-time task overview with completion metrics',
        'Admin-only clear buttons to reset data',
        'Quick access to all platform features',
        'Live performance statistics',
      ],
      path: '/',
      color: 'from-black to-zinc-800',
    },
    {
      id: 2,
      title: 'All Tasks - Master View',
      description: 'View and manage all campaigns with their tasks in a hierarchical structure. Each master task automatically generates 7 subtasks.',
      icon: ClipboardList,
      features: [
        'Collapsible campaign hierarchy',
        'Progress tracking per campaign',
        'Assign tasks to team members',
        'Mark tasks complete with timestamps',
        'Add notes and comments',
      ],
      path: '/tasks',
      color: 'from-zinc-800 to-zinc-700',
    },
    {
      id: 3,
      title: 'Campaign Manager',
      description: 'Manage campaigns through their lifecycle with team plans, generated subtasks, assignments, and progress tracking in one place.',
      icon: Target,
      features: [
        'Campaign-first organization',
        'Cross-team task planning',
        'Deadline tracking',
        'Status indicators',
        'Performance metrics',
      ],
      path: '/campaigns',
      color: 'from-zinc-700 to-zinc-600',
    },
    {
      id: 4,
      title: 'Mistake Logger',
      description: 'Track and resolve quality issues. Log mistakes by team members with full resolution lifecycle management.',
      icon: AlertTriangle,
      features: [
        'Log mistakes on campaign or team tasks',
        'Track resolution status (Yes/No)',
        'Record who resolved issues',
        'Filter by team and status',
        'Accountability tracking',
      ],
      path: '/mistakes',
      color: 'from-red-600 to-red-700',
    },
    {
      id: 5,
      title: 'XLSX Bulk Upload',
      description: 'Upload campaigns in bulk via XLSX files. Automatic function classification and subtask generation.',
      icon: Upload,
      features: [
        'Excel file upload support',
        'Automatic function detection',
        '7 subtasks auto-generated per master task',
        'Bulk campaign import',
        'Validation and error checking',
      ],
      color: 'from-blue-600 to-blue-700',
    },
    {
      id: 6,
      title: 'Updates Feed',
      description: 'Celebrate team wins and successes. Log achievements, volume wins, and quality improvements.',
      icon: Trophy,
      features: [
        'Log team successes',
        'Volume and quality tracking',
        'Agent achievements',
        'Timeline view',
        'Team motivation hub',
      ],
      path: '/successes',
      color: 'from-yellow-600 to-yellow-700',
    },
    {
      id: 7,
      title: 'Team Analytics',
      description: 'Deep dive into team performance metrics, completion rates, and productivity insights.',
      icon: BarChart3,
      features: [
        'Team performance charts',
        'Task completion analytics',
        'Productivity trends',
        'Member comparisons',
        'Export reports',
      ],
      path: '/analytics',
      color: 'from-green-600 to-green-700',
    },
    {
      id: 8,
      title: 'User Management',
      description: 'Admin-only control panel. Manage roles, permissions, and per-user feature access.',
      icon: Users,
      features: [
        'Role assignment (Admin/Member)',
        'Per-user feature toggles',
        'Owner: ahmedlalatoo2013@gmail.com',
        'Default admin: adel@try-gc.com',
        'Team member management',
      ],
      path: '/user-management',
      color: 'from-purple-600 to-purple-700',
    },
    {
      id: 9,
      title: 'Community & Communication',
      description: 'Team collaboration hub for announcements, discussions, and community building.',
      icon: MessageCircle,
      features: [
        'Team announcements',
        'Discussion threads',
        'Community engagement',
        'Knowledge sharing',
      ],
      path: '/campaigns',
      color: 'from-indigo-600 to-indigo-700',
    },
    {
      id: 10,
      title: 'Data Management',
      description: 'Export and import data for backup, reporting, and data migration purposes.',
      icon: Download,
      features: [
        'Export all data to JSON',
        'Import data from backups',
        'Data migration tools',
        'Backup management',
      ],
      path: '/data-export',
      color: 'from-teal-600 to-teal-700',
    },
  ];

  const memberSteps: DemoStep[] = [
    {
      id: 1,
      title: 'Welcome to Your Personal Dashboard',
      description: 'Track your personal performance, view your rank progression, and see tasks assigned to you.',
      icon: User,
      features: [
        'Personal rank progression (Football legends)',
        'Your completed tasks count',
        'Points and achievements',
        'Next rank requirements',
      ],
      path: '/personal',
      color: 'from-black to-zinc-800',
    },
    {
      id: 2,
      title: 'Campaign Manager',
      description: 'View campaigns and their connected tasks in one place so your day-to-day work stays organized by campaign.',
      icon: Target,
      features: [
        'Campaign-organized tasks',
        'Your assignments',
        'Deadline tracking',
        'Status updates',
      ],
      path: '/campaigns',
      color: 'from-zinc-700 to-zinc-600',
    },
    {
      id: 3,
      title: 'Mistake Logger',
      description: 'Log mistakes you encounter from team members to improve quality and accountability.',
      icon: AlertTriangle,
      features: [
        'Report quality issues',
        'Log team mistakes',
        'Track resolutions',
        'Improve processes',
      ],
      path: '/mistakes',
      color: 'from-red-600 to-red-700',
    },
    {
      id: 4,
      title: 'Updates Feed',
      description: 'Celebrate wins and view team successes. Share your achievements.',
      icon: Trophy,
      features: [
        'View team wins',
        'Celebrate successes',
        'Log your achievements',
        'Team motivation',
      ],
      path: '/successes',
      color: 'from-yellow-600 to-yellow-700',
    },
    {
      id: 5,
      title: 'Campaign Manager',
      description: 'Connect with your team, manage campaigns through their 6-phase lifecycle.',
      icon: MessageCircle,
      features: [
        'Campaign 6-phase lifecycle',
        'Phase checklists with Trygc workflow',
        'Progress tracking per phase',
        'Campaign performance overview',
      ],
      path: '/campaigns',
      color: 'from-indigo-600 to-indigo-700',
    },
  ];

  const steps = isAdmin ? adminSteps : memberSteps;
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeDemo = async (destination?: string) => {
    setIsCompleting(true);
    
    try {
      await apiRequest('complete-demo', {
        method: 'POST',
        body: { email: userEmail },
      });

      if (ctx?.setDemoCompleted) {
        ctx.setDemoCompleted(true);
      }
    } catch (error) {
      console.error('Error marking demo complete:', error);
    }

    setTimeout(() => {
      navigate(destination || (isAdmin ? '/' : '/personal'));
    }, 500);
  };

  const handleSkip = () => {
    if (confirm('Are you sure you want to skip the demo? You can access it later from Settings.')) {
      completeDemo();
    }
  };

  const handleGoToPage = () => {
    if (currentStepData.path) {
      completeDemo(currentStepData.path);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 overflow-y-auto">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-zinc-300 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black">Welcome, {userName}! 👋</h1>
              <p className="text-zinc-400 font-medium">Let's explore your campaign management platform</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-all group"
            title="Skip Demo"
          >
            <X className="w-5 h-5 text-zinc-400 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-black text-white">
            Step {currentStep + 1} of {steps.length}
          </span>
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-bold text-zinc-400">
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="flex gap-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                index <= currentStep ? 'bg-white' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        <div
          className={`bg-gradient-to-br ${currentStepData.color} rounded-[3rem] p-12 mb-8 relative overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative z-10">
            <div className="flex items-start gap-6 mb-8">
              <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shrink-0">
                <currentStepData.icon className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="inline-block px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-black text-white mb-3 border border-white/30">
                  FEATURE #{currentStepData.id}
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">
                  {currentStepData.title}
                </h2>
                <p className="text-xl text-white/80 font-medium leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>
            </div>

            {/* Features List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentStepData.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 animate-in slide-in-from-left duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-white">{feature}</span>
                </div>
              ))}
            </div>

            {/* Try It Button */}
            {currentStepData.path && (
              <div className="mt-8">
                <button
                  onClick={handleGoToPage}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-black text-sm hover:bg-white/90 transition-all shadow-xl"
                >
                  <Play className="w-4 h-4" />
                  Try This Feature Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-2xl font-black text-sm hover:bg-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-white w-8'
                    : index < currentStep
                    ? 'bg-zinc-500'
                    : 'bg-zinc-700'
                }`}
                title={`Step ${index + 1}`}
              />
            ))}
          </div>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={() => completeDemo()}
              disabled={isCompleting}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-black text-sm hover:bg-zinc-200 transition-all disabled:opacity-50 shadow-xl"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  Complete Demo
                  <Zap className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-black text-sm hover:bg-zinc-200 transition-all shadow-xl"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="text-3xl font-black text-white mb-1">{steps.length}</div>
            <div className="text-xs font-black text-zinc-400 uppercase tracking-wider">
              Features to Explore
            </div>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="text-3xl font-black text-white mb-1">
              {isAdmin ? 'Admin' : 'Member'}
            </div>
            <div className="text-xs font-black text-zinc-400 uppercase tracking-wider">
              Your Role
            </div>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="text-3xl font-black text-white mb-1">24/7</div>
            <div className="text-xs font-black text-zinc-400 uppercase tracking-wider">
              Platform Access
            </div>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="text-3xl font-black text-white mb-1">
              {currentStep + 1}/{steps.length}
            </div>
            <div className="text-xs font-black text-zinc-400 uppercase tracking-wider">
              Progress
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500 font-medium">
            You can access this demo anytime from <span className="text-white font-bold">Settings → Platform Demo</span>
          </p>
        </div>
      </div>
    </div>
  );
}
