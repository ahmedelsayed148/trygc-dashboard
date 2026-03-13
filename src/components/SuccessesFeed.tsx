import React, { useContext, useState } from 'react';
import { AppContext } from './Root';
import { Trophy, Award, Zap, TrendingUp, Calendar, Filter, Search, Star, Edit2, Trash2, X, Save } from 'lucide-react';

export function SuccessesFeed() {
  const ctx = useContext(AppContext);
  const successLogs = ctx?.successLogs || [];
  const setSuccessLogs = ctx?.setSuccessLogs || (() => {});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ agent: '', detail: '' });

  const filteredSuccesses = successLogs.filter((log: any) => {
    const matchesSearch = 
      log.agent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || log.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleEdit = (log: any) => {
    setEditingId(log.id);
    setEditForm({ agent: log.agent, detail: log.detail });
  };

  const handleSave = () => {
    if (editingId) {
      setSuccessLogs(successLogs.map((log: any) => 
        log.id === editingId ? { ...log, ...editForm } : log
      ));
      setEditingId(null);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this update?')) {
      setSuccessLogs(successLogs.filter((log: any) => log.id !== id));
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-black to-zinc-800 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black mb-1">Updates</h1>
            <p className="text-zinc-300 text-lg font-medium">Celebrate wins and achievements</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-white/90">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            <span className="text-sm font-bold">{successLogs.length} Total Wins</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            <span className="text-sm font-bold">Team Excellence</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Search updates..." 
              className="w-full pl-12 pr-6 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-2xl outline-none text-sm font-medium transition-all text-zinc-800 dark:text-zinc-200" 
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            {['All', 'Volume', 'SLA', 'Quality'].map(type => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  filterType === type ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Success Cards */}
      <div className="space-y-4">
        {filteredSuccesses.length > 0 ? (
          filteredSuccesses.map((success: any) => (
            <div key={success.id} className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-xl transition-all group">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-14 h-14 bg-gradient-to-br from-black to-zinc-700 dark:from-white dark:to-zinc-300 rounded-2xl flex items-center justify-center text-white dark:text-black shadow-lg flex-shrink-0">
                  <Trophy className="w-7 h-7" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {editingId === success.id ? (
                    <div className="space-y-3">
                      <input
                        value={editForm.agent}
                        onChange={e => setEditForm({...editForm, agent: e.target.value})}
                        className="w-full px-4 py-2 border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-xl outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors font-bold"
                        placeholder="Agent Name"
                      />
                      <textarea
                        value={editForm.detail}
                        onChange={e => setEditForm({...editForm, detail: e.target.value})}
                        className="w-full px-4 py-2 border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-xl h-24 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                        placeholder="Details"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={handleSave} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all">
                          <Save className="w-4 h-4" /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="text-xl font-black text-zinc-800 dark:text-zinc-100 mb-1">{success.agent}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold uppercase">
                              {success.type || 'Success'}
                            </span>
                            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {success.date || success.time}
                            </span>
                            {success.time && success.date && (
                              <span className="text-xs font-medium text-zinc-400">
                                {success.time}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(success)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(success.id)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">{success.detail}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-16 text-center">
            <Trophy className="w-20 h-20 text-zinc-200 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 mb-2">No Updates Yet</h3>
            <p className="text-zinc-500 font-medium">Start logging wins to celebrate team achievements!</p>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {successLogs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-black to-zinc-800 rounded-3xl p-6 text-white shadow-lg">
            <Zap className="w-8 h-8 mb-3 opacity-80" />
            <div className="text-3xl font-black mb-1">{successLogs.length}</div>
            <div className="text-zinc-300 text-sm font-bold uppercase tracking-wider">Total Wins</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-3xl p-6 text-white shadow-lg">
            <TrendingUp className="w-8 h-8 mb-3 opacity-80" />
            <div className="text-3xl font-black mb-1">{[...new Set(successLogs.map((s: any) => s.agent))].length}</div>
            <div className="text-zinc-300 text-sm font-bold uppercase tracking-wider">Contributing Members</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-600 to-zinc-700 rounded-3xl p-6 text-white shadow-lg">
            <Award className="w-8 h-8 mb-3 opacity-80" />
            <div className="text-3xl font-black mb-1">
              {successLogs.length > 0 ? (successLogs.length / [...new Set(successLogs.map((s: any) => s.agent))].length).toFixed(1) : 0}
            </div>
            <div className="text-zinc-300 text-sm font-bold uppercase tracking-wider">Avg per Member</div>
          </div>
        </div>
      )}
    </div>
  );
}