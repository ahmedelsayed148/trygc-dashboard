import React, { useContext, useState } from 'react';
import { AppContext } from './Root';
import { useNavigate } from '../lib/routerCompat';
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Database, Users, Save, Download, Upload, X, Sparkles, ClipboardList } from 'lucide-react';
import { supabase } from './supabaseClient';
import { AdminDataActions } from './AdminDataActions';
import { useAppearance } from '../context/AppearanceContext';
import { FONT_FAMILY_TOKENS, FONT_OPTIONS, FONT_SCALE_PRESETS } from '../lib/appearanceOptions';
import { cn } from '../lib/utils';
import type { User as AppUser } from '../types';

const LazySOPModal = React.lazy(() =>
  import('./SOPModal').then((module) => ({ default: module.SOPModal })),
);

export function Settings() {
  const ctx = useContext(AppContext);
  const navigate = useNavigate();
  const { fontFamily, fontScale, resetAppearance, setFontFamily, setFontScale } = useAppearance();
  const userName = ctx?.userName || '';
  const userEmail = ctx?.userEmail || '';
  const isAdmin = ctx?.isAdmin || false;
  const teamMembers: AppUser[] = ctx?.teamMembers || [];
  const [activeSection, setActiveSection] = useState('profile');
  const [isSOPOpen, setIsSOPOpen] = useState(false);
  
  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    ...(isAdmin ? [
      { id: 'team', label: 'Team Management', icon: Users },
      { id: 'data', label: 'Data Management', icon: Database }
    ] : []),
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Settings</h1>
        <p className="text-zinc-500 font-medium">Manage your account and application preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="rounded-[var(--app-card-radius-sm)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 space-y-0.5">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left text-sm font-semibold',
                  activeSection === section.id
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900',
                )}
              >
                <section.icon className="w-4 h-4 shrink-0" />
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="rounded-[var(--app-card-radius-sm)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Profile Settings</h2>
                  <p className="text-zinc-600 dark:text-zinc-400">Manage your personal information</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase text-zinc-400 mb-2 block">Display Name</label>
                    <input 
                      type="text" 
                      value={userName} 
                      readOnly
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl font-medium text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-zinc-400 mb-2 block">Email Address</label>
                    <input 
                      type="email" 
                      value={userEmail} 
                      readOnly
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl font-medium text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-zinc-400 mb-2 block">Role</label>
                    <div className={`w-fit px-4 py-2 rounded-xl font-bold text-sm ${
                      isAdmin ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}>
                      {isAdmin ? 'Administrator' : 'Team Member'}
                    </div>
                  </div>
                  
                  {/* Platform Demo Card */}
                  <div className="p-6 bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div className="flex items-start gap-3 mb-4">
                      <Sparkles className="w-6 h-6 text-zinc-700 dark:text-zinc-300 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-zinc-800 dark:text-zinc-100 mb-1">Platform Demo</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Watch the interactive walkthrough to learn about all features
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/demo')}
                      className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      View Demo
                    </button>
                  </div>

                  {/* SOP & Roles Card */}
                  <div className="p-6 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/30 dark:to-purple-950/10 border-2 border-purple-200 dark:border-purple-900 rounded-2xl">
                    <div className="flex items-start gap-3 mb-4">
                      <ClipboardList className="w-6 h-6 text-purple-700 dark:text-purple-400 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-zinc-800 dark:text-zinc-100 mb-1">📋 SOP & Roles</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          View comprehensive role descriptions and standard operating procedures for all departments
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsSOPOpen(true)}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center gap-2"
                    >
                      <ClipboardList className="w-4 h-4" />
                      Open SOP & Roles
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SOP Modal */}
            {isSOPOpen && (
              <React.Suspense fallback={null}>
                <LazySOPModal isOpen={isSOPOpen} onClose={() => setIsSOPOpen(false)} />
              </React.Suspense>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Notification Preferences</h2>
                  <p className="text-zinc-600 dark:text-zinc-400">Choose how you want to be notified</p>
                </div>
                <div className="space-y-4">
                  {[
                    { title: 'Task Assignments', desc: 'Get notified when tasks are assigned to you' },
                    { title: 'Success Logs', desc: 'Notifications for team successes' },
                    { title: 'SLA Alerts', desc: 'Reminders for approaching deadlines' },
                  ].map(item => (
                    <div key={item.title} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
                      <div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-100">{item.title}</div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</div>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 accent-black dark:accent-white" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Security Settings</h2>
                  <p className="text-zinc-600 dark:text-zinc-400">Manage your account security</p>
                </div>
                <div className="space-y-4">
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-100 mb-2">Password</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Change your account password</p>
                    <button 
                      onClick={() => setShowPasswordModal(true)}
                      className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
                    >
                      Change Password
                    </button>
                  </div>
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-100 mb-2">Two-Factor Authentication</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Add an extra layer of security to your account</p>
                    <button className="px-6 py-3 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Appearance</h2>
                  <p className="text-zinc-600 dark:text-zinc-400">Customize how the app looks</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase text-zinc-400 mb-3 block">Theme</label>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Use the theme toggle in the top bar to switch between the monochrome light and dark themes.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl text-left">
                        <div className="w-full h-20 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 rounded-xl mb-3"></div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-100">Light</div>
                        <div className="text-xs text-zinc-500">White-led shell with black accents</div>
                      </div>
                      <div className="p-4 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl text-left">
                        <div className="w-full h-20 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-xl mb-3"></div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-100">Dark</div>
                        <div className="text-xs text-zinc-500">Black-led shell with white accents</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-zinc-400 mb-3 block">Font Family</label>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {FONT_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setFontFamily(option.id)}
                          className={`rounded-2xl border-2 p-4 text-left transition-all ${
                            fontFamily === option.id
                              ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="text-lg font-bold" style={{ fontFamily: FONT_FAMILY_TOKENS[option.id] }}>{option.label}</div>
                          <div className={`mt-2 text-sm ${fontFamily === option.id ? 'text-white/80 dark:text-black/70' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {option.description}
                          </div>
                          <div className="mt-3 text-sm" style={{ fontFamily: FONT_FAMILY_TOKENS[option.id] }}>
                            {option.sample}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <label className="text-xs font-black uppercase text-zinc-400 block">Text Size</label>
                      <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {Math.round(fontScale * 100)}%
                      </div>
                    </div>
                    <div className="rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {FONT_SCALE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => setFontScale(preset.scale)}
                            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                              Math.abs(fontScale - preset.scale) < 0.001
                                ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                                : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600'
                            }`}
                          >
                            <div className="text-sm font-black">{preset.label}</div>
                            <div className={`mt-1 text-xs ${
                              Math.abs(fontScale - preset.scale) < 0.001
                                ? 'text-white/80 dark:text-black/70'
                                : 'text-zinc-500 dark:text-zinc-400'
                            }`}>
                              {preset.description}
                            </div>
                          </button>
                        ))}
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.45"
                        step="0.05"
                        value={fontScale}
                        onChange={(event) => setFontScale(Number(event.target.value))}
                        className="mt-4 w-full accent-black dark:accent-white"
                      />
                      <div className="mt-3 flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        <span>Compact</span>
                        <span>Default</span>
                        <span>Accessible</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase text-zinc-400 mb-2">Live Preview</div>
                        <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Workspace Typography</div>
                        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                          Headlines, cards, and controls will update immediately across the app.
                        </p>
                      </div>
                      <button
                        onClick={resetAppearance}
                        className="px-4 py-2 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'team' && isAdmin && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Team Management</h2>
                  <p className="text-zinc-600 dark:text-zinc-400">Manage team members and permissions</p>
                </div>
                <div className="space-y-3">
                  {teamMembers && teamMembers.length > 0 ? (
                    teamMembers.map((member, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black font-black text-sm">
                            {member.name?.substring(0, 2).toUpperCase() || 'TM'}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-800 dark:text-zinc-100">{member.name || 'Team Member'}</div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">{member.email || 'email@example.com'}</div>
                          </div>
                        </div>
                        <div className="text-xs font-bold px-3 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg">
                          {member.role || 'Member'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-zinc-400">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">No team members yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'data' && isAdmin && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">Data Management</h2>
                  <p className="text-zinc-600 dark:text-zinc-400">Manage application data and backups</p>
                </div>
                <div className="space-y-4">
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div className="flex items-start gap-3 mb-4">
                      <Download className="w-6 h-6 text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-zinc-800 dark:text-zinc-100 mb-1">Export Data</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Download all your data for backup or migration</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/data-export')}
                      className="px-6 py-3 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black rounded-xl font-bold hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Go to Data Export
                    </button>
                  </div>
                  
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div className="flex items-start gap-3 mb-4">
                      <Upload className="w-6 h-6 text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-zinc-800 dark:text-zinc-100 mb-1">Import Data</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Restore data from a previous export</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/data-import')}
                      className="px-6 py-3 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black rounded-xl font-bold hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-all flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Go to Data Import
                    </button>
                  </div>
                  <AdminDataActions />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-zinc-800 dark:text-zinc-100">Change Password</h2>
              <button 
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 mb-2 block">New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl font-medium text-zinc-800 dark:text-zinc-200 focus:border-zinc-300 dark:focus:border-zinc-700 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 mb-2 block">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl font-medium text-zinc-800 dark:text-zinc-200 focus:border-zinc-300 dark:focus:border-zinc-700 outline-none transition-colors"
                />
              </div>
              {passwordError && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{passwordError}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
                disabled={isChangingPassword}
                className="flex-1 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!newPassword || !confirmPassword) {
                    setPasswordError('Please fill in all fields');
                    return;
                  }
                  if (newPassword.length < 6) {
                    setPasswordError('Password must be at least 6 characters');
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordError('Passwords do not match');
                    return;
                  }
                  setIsChangingPassword(true);
                  setPasswordError('');
                  try {
                    const { error } = await supabase.auth.updateUser({
                      password: newPassword
                    });
                    if (error) {
                      setPasswordError(error.message);
                    } else {
                      alert('Password changed successfully!');
                      setShowPasswordModal(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }
                  } catch (error: unknown) {
                    console.error('Error changing password:', error);
                    setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
                  } finally {
                    setIsChangingPassword(false);
                  }
                }}
                disabled={isChangingPassword}
                className="flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></div>
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
