import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import { useLang } from '../../context/LanguageContext';
import { translateComplaints } from '../../utils/translateCache';
import { useCountUp } from '../../animations/useAnimations';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ─── Department config ────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { key: 'Roads',       label: 'Roads & Transport',   icon: '🛣️',  color: 'from-orange-400 to-amber-500',   bg: 'bg-orange-50',   border: 'border-orange-200',  text: 'text-orange-700',  ring: 'ring-orange-400' },
  { key: 'Municipal',   label: 'Municipality',         icon: '🏛️',  color: 'from-violet-500 to-purple-600',  bg: 'bg-violet-50',   border: 'border-violet-200',  text: 'text-violet-700',  ring: 'ring-violet-400' },
  { key: 'Electricity', label: 'Electricity',          icon: '⚡',  color: 'from-yellow-400 to-orange-400',  bg: 'bg-yellow-50',   border: 'border-yellow-200',  text: 'text-yellow-700',  ring: 'ring-yellow-400' },
  { key: 'Water',       label: 'Water Supply',         icon: '💧',  color: 'from-sky-400 to-blue-500',       bg: 'bg-sky-50',      border: 'border-sky-200',     text: 'text-sky-700',     ring: 'ring-sky-400'    },
  { key: 'Parks',       label: 'Parks & Recreation',   icon: '🌳',  color: 'from-emerald-400 to-green-500',  bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-400'},
];

const CATEGORIES = ['Roads', 'Municipal', 'Electricity', 'Water', 'Parks', 'Other'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getSlaRules  = () => { try { return JSON.parse(localStorage.getItem('civic_sla_rules') || '[]'); } catch { return []; } };
const saveSlaRules = (r) => localStorage.setItem('civic_sla_rules', JSON.stringify(r));

const getDept = (key) => DEPARTMENTS.find(d => d.key === key) ?? DEPARTMENTS[0];

const StatusBadge = ({ status }) => {
  const map = {
    Resolved:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    Pending:    'bg-amber-100  text-amber-700  border-amber-200',
    InProgress: 'bg-blue-100   text-blue-700   border-blue-200',
  };
  const label = status === 'InProgress' ? 'In Progress' : status;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status === 'Resolved' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {status === 'Pending'  && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"  />}
      {status === 'InProgress' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
      {label}
    </span>
  );
};

const ProgressBar = ({ value, total, color = 'bg-indigo-500' }) => (
  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
    <div
      className={`${color} h-1.5 rounded-full transition-all duration-700`}
      style={{ width: `${Math.min((value / (total || 1)) * 100, 100)}%` }}
    />
  </div>
);

const AnalyticsCard = ({ label, value, icon, color, index, onClick, isActive }) => {
  const count = useCountUp(value ?? 0, 1100);
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${color} rounded-2xl p-5 text-white card-lift animate-fade-up transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-xl' : ''} ${isActive ? 'ring-4 ring-white/60 scale-105 shadow-xl' : ''}`}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className="font-display font-bold text-4xl stat-card-num">{count}</span>
      </div>
      <p className="text-white/80 text-sm">{label}</p>
      {onClick && <p className="text-white/50 text-xs mt-1">Click to filter ↓</p>}
    </div>
  );
};

// ─── Performance: Stat ring ───────────────────────────────────────────────────

const MiniRing = ({ value, total, color }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const r = 18, circ = 2 * Math.PI * r;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="rotate-[-90deg]">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
        strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
};

// ─── Performance: Department card ─────────────────────────────────────────────

const DeptCard = ({ dept, officerCount, totalIssues, resolved, onClick }) => {
  const d = getDept(dept.key);
  const resRate = totalIssues > 0 ? Math.round((resolved / totalIssues) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left ${d.bg} border ${d.border} rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 focus:outline-none focus:ring-2 ${d.ring} focus:ring-offset-2`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${d.color} flex items-center justify-center text-2xl shadow-sm`}>
          {dept.icon}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${d.bg} ${d.text} border ${d.border}`}>
          {officerCount} officer{officerCount !== 1 ? 's' : ''}
        </span>
      </div>
      <h3 className={`font-bold text-base ${d.text} mb-1`}>{dept.label}</h3>
      <p className="text-gray-500 text-xs mb-4">{totalIssues} issues assigned</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Resolution rate</span>
          <span className="font-semibold text-gray-700">{resRate}%</span>
        </div>
        <ProgressBar value={resolved} total={totalIssues} color={`bg-gradient-to-r ${d.color}`} />
      </div>
      <div className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-gray-400 group-hover:text-gray-600 transition-colors">
        View officers <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
      </div>
    </button>
  );
};

// ─── Performance: Officer card ────────────────────────────────────────────────

const OfficerCard = ({ officer, deptMeta, onClick, index }) => {
  const { stats = {} } = officer;
  const resRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const initials = officer.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1.5 hover:border-transparent transition-all duration-200 animate-fade-up focus:outline-none focus:ring-2 focus:ring-indigo-300"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${deptMeta.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{officer.name}</p>
          <p className="text-gray-400 text-xs truncate">{officer.email}</p>
        </div>
        <span className={`ml-auto flex-shrink-0 w-2 h-2 rounded-full ${officer.isActive ? 'bg-emerald-400' : 'bg-gray-300'}`} title={officer.isActive ? 'Active' : 'Inactive'} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Total',       val: stats.total      ?? 0, color: 'text-gray-700' },
          { label: 'Resolved',    val: stats.resolved   ?? 0, color: 'text-emerald-600' },
          { label: 'Pending',     val: stats.pending    ?? 0, color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="text-center bg-gray-50 rounded-xl py-2 px-1">
            <p className={`font-bold text-lg leading-none ${s.color}`}>{s.val}</p>
            <p className="text-gray-400 text-[10px] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Resolution bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-gray-400">
          <span>Resolution rate</span>
          <span className="font-semibold text-gray-600">{resRate}%</span>
        </div>
        <ProgressBar value={stats.resolved ?? 0} total={stats.total ?? 0} color={`bg-gradient-to-r ${deptMeta.color}`} />
      </div>

      {/* In-progress indicator */}
      {(stats.inProgress ?? 0) > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          {stats.inProgress} issue{stats.inProgress !== 1 ? 's' : ''} in progress
        </div>
      )}

      <div className="mt-3 text-right text-xs text-gray-300 group-hover:text-indigo-400 transition-colors font-semibold">
        View details →
      </div>
    </button>
  );
};

// ─── Performance: Issue row ───────────────────────────────────────────────────

const IssueRow = ({ issue, index }) => (
  <div
    className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors animate-fade-up border border-transparent hover:border-gray-100"
    style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
  >
    {/* Status indicator */}
    <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
      issue.status === 'Resolved'   ? 'bg-emerald-400' :
      issue.status === 'InProgress' ? 'bg-blue-400 ring-2 ring-blue-200' :
      'bg-amber-400'
    }`} />

    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <p className="font-semibold text-gray-800 text-sm leading-snug">{issue.title}</p>
        <StatusBadge status={issue.status} />
      </div>
      <p className="text-gray-400 text-xs mt-1 line-clamp-2">{issue.description}</p>
      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
        <span>📁 {issue.category}</span>
        <span>📅 {new Date(issue.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        {issue.priority && <span className={`font-medium ${issue.priority === 'High' ? 'text-red-500' : issue.priority === 'Medium' ? 'text-amber-500' : 'text-gray-400'}`}>⚑ {issue.priority}</span>}
      </div>
    </div>
  </div>
);

// ─── Performance: Officer detail panel ───────────────────────────────────────

const OfficerDetailPanel = ({ officerId, deptMeta, onBack }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('All');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get(`${API_BASE}/admin/officers/${officerId}/issues`)
      .then(r => { if (!cancelled) { setData(r.data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [officerId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return (
    <div className="text-center py-16 text-gray-400">Failed to load officer data.</div>
  );

  const { officer, stats, complaints } = data;
  const resRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const initials = officer.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  const filtered = filter === 'All' ? complaints : complaints.filter(c =>
    filter === 'InProgress' ? c.status === 'InProgress' : c.status === filter
  );

  return (
    <div className="animate-fade-up">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors group"
      >
        <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span>
        Back to officers
      </button>

      {/* Profile header */}
      <div className={`bg-gradient-to-br ${deptMeta.color} rounded-2xl p-6 text-white mb-5`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl font-bold shadow-inner flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-xl leading-tight">{officer.name}</h2>
            <p className="text-white/75 text-sm mt-0.5">{officer.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs bg-white/20 rounded-full px-2.5 py-0.5">{officer.department || 'No dept'}</span>
              {officer.jurisdiction && <span className="text-xs bg-white/20 rounded-full px-2.5 py-0.5">📍 {officer.jurisdiction}</span>}
              <span className={`text-xs rounded-full px-2.5 py-0.5 ${officer.isActive ? 'bg-emerald-400/30 text-emerald-100' : 'bg-red-400/30 text-red-100'}`}>
                {officer.isActive ? '● Active' : '○ Inactive'}
              </span>
            </div>
          </div>
          {/* Resolution ring */}
          <div className="flex-shrink-0 relative">
            <MiniRing value={stats.resolved} total={stats.total} color="rgba(255,255,255,0.9)" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{resRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Assigned', val: stats.total,      bg: 'bg-gray-50',     text: 'text-gray-800',    icon: '📋' },
          { label: 'Resolved',       val: stats.resolved,   bg: 'bg-emerald-50',  text: 'text-emerald-700', icon: '✅' },
          { label: 'Pending',        val: stats.pending,    bg: 'bg-amber-50',    text: 'text-amber-700',   icon: '⏳' },
          { label: 'In Progress',    val: stats.inProgress, bg: 'bg-blue-50',     text: 'text-blue-700',    icon: '🔧' },
        ].map((s, i) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center animate-fade-up`} style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className={`font-bold text-2xl ${s.text}`}>{s.val}</p>
            <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Resolution progress */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Overall Resolution Rate</span>
          <span className="text-sm font-bold text-emerald-600">{resRate}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`bg-gradient-to-r ${deptMeta.color} h-2.5 rounded-full transition-all duration-1000`}
            style={{ width: `${resRate}%` }}
          />
        </div>
      </div>

      {/* Issues list */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-bold text-gray-900">Assigned Issues ({complaints.length})</h3>
          <div className="flex gap-1.5">
            {['All', 'Resolved', 'Pending', 'InProgress'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === f
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f === 'InProgress' ? 'In Progress' : f}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-50 px-2 py-2 max-h-[420px] overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No issues in this category.</div>
          ) : (
            filtered.map((issue, i) => <IssueRow key={issue._id} issue={issue} index={i} />)
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Performance: Officers list view ─────────────────────────────────────────

const DeptOfficersView = ({ deptKey, onSelectOfficer, onBack }) => {
  const deptMeta               = getDept(deptKey);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [sort, setSort]        = useState('resolved');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get(`${API_BASE}/admin/departments/${deptKey}/officers`)
      .then(r => { if (!cancelled) { setOfficers(r.data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deptKey]);

  const sorted = [...officers].sort((a, b) => {
    const sa = a.stats ?? {}, sb = b.stats ?? {};
    if (sort === 'resolved')   return (sb.resolved   ?? 0) - (sa.resolved   ?? 0);
    if (sort === 'total')      return (sb.total       ?? 0) - (sa.total       ?? 0);
    if (sort === 'pending')    return (sb.pending     ?? 0) - (sa.pending     ?? 0);
    return a.name?.localeCompare(b.name);
  });

  return (
    <div className="animate-fade-up">
      {/* Breadcrumb */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 mb-4 group transition-colors">
        <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span>
        All Departments
      </button>

      {/* Dept header */}
      <div className={`bg-gradient-to-br ${deptMeta.color} rounded-2xl px-6 py-5 text-white mb-5 flex items-center gap-4`}>
        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-3xl flex-shrink-0">
          {deptMeta.icon}
        </div>
        <div>
          <h2 className="font-bold text-xl">{deptMeta.label}</h2>
          <p className="text-white/70 text-sm">{officers.length} officer{officers.length !== 1 ? 's' : ''} assigned</p>
        </div>
      </div>

      {/* Sort controls */}
      {officers.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Sort by:</span>
          {[['resolved','Most Resolved'], ['total','Most Issues'], ['pending','Most Pending'], ['name','Name']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                sort === k ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Officers grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-2xl">
          <div className="text-5xl mb-3">{deptMeta.icon}</div>
          <p className="font-medium">No officers assigned to {deptMeta.label}</p>
          <p className="text-sm mt-1">Create officers from the Officers tab and assign them to this department.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((o, i) => (
            <OfficerCard
              key={o._id}
              officer={o}
              deptMeta={deptMeta}
              index={i}
              onClick={() => onSelectOfficer(o._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Performance: Department overview ────────────────────────────────────────

const DeptOverview = ({ allOfficers, allComplaints, onSelectDept }) => {
  // Pre-compute per-dept stats from already-loaded data
  const deptStats = DEPARTMENTS.map(d => {
    const dOfficers = allOfficers.filter(o =>
      o.department?.toLowerCase().includes(d.key.toLowerCase())
    );
    const dComplaints = allComplaints.filter(c =>
      c.category?.toLowerCase().includes(d.key.toLowerCase()) ||
      c.department?.toLowerCase().includes(d.key.toLowerCase())
    );
    const resolved = dComplaints.filter(c => c.status === 'Resolved').length;
    return { ...d, officerCount: dOfficers.length, totalIssues: dComplaints.length, resolved };
  });

  const totalIssues  = deptStats.reduce((s, d) => s + d.totalIssues, 0);
  const totalResolved = deptStats.reduce((s, d) => s + d.resolved, 0);
  const overallRate  = totalIssues > 0 ? Math.round((totalResolved / totalIssues) * 100) : 0;

  return (
    <div className="animate-fade-up">
      {/* Summary banner */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white mb-6 flex flex-wrap gap-6 items-center">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Platform Overview</p>
          <h2 className="font-bold text-2xl">Department Performance</h2>
          <p className="text-slate-400 text-sm mt-0.5">Click a department to drill into its officers</p>
        </div>
        <div className="ml-auto flex gap-6">
          {[
            { label: 'Total Issues',   val: totalIssues,   color: 'text-white' },
            { label: 'Resolved',       val: totalResolved, color: 'text-emerald-400' },
            { label: 'Overall Rate',   val: `${overallRate}%`, color: 'text-sky-400' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`font-bold text-2xl ${s.color}`}>{s.val}</p>
              <p className="text-slate-400 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Department grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {deptStats.map((d, i) => (
          <div key={d.key} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
            <DeptCard
              dept={d}
              officerCount={d.officerCount}
              totalIssues={d.totalIssues}
              resolved={d.resolved}
              onClick={() => onSelectDept(d.key)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Performance Tab (orchestrator) ──────────────────────────────────────────

const PerformanceTab = ({ officers, complaints }) => {
  const [view, setView]               = useState('depts');   // 'depts' | 'officers' | 'officer'
  const [activeDept, setActiveDept]   = useState(null);
  const [activeOfficer, setActiveOfficer] = useState(null);

  const goToDepts = useCallback(() => { setView('depts'); setActiveDept(null); setActiveOfficer(null); }, []);
  const goToOfficers = useCallback((deptKey) => { setActiveDept(deptKey); setView('officers'); setActiveOfficer(null); }, []);
  const goToOfficer  = useCallback((officerId) => { setActiveOfficer(officerId); setView('officer'); }, []);

  // Breadcrumb
  const deptMeta = activeDept ? getDept(activeDept) : null;

  return (
    <div>
      {/* Breadcrumb trail */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-5 flex-wrap">
        <button onClick={goToDepts} className={`hover:text-indigo-600 transition-colors font-medium ${view === 'depts' ? 'text-indigo-600' : ''}`}>
          Departments
        </button>
        {(view === 'officers' || view === 'officer') && deptMeta && (
          <>
            <span>/</span>
            <button onClick={() => goToOfficers(activeDept)} className={`hover:text-indigo-600 transition-colors font-medium ${view === 'officers' ? 'text-indigo-600' : ''}`}>
              {deptMeta.label}
            </button>
          </>
        )}
        {view === 'officer' && (
          <>
            <span>/</span>
            <span className="text-indigo-600 font-medium">Officer Detail</span>
          </>
        )}
      </nav>

      {view === 'depts' && (
        <DeptOverview allOfficers={officers} allComplaints={complaints} onSelectDept={goToOfficers} />
      )}
      {view === 'officers' && activeDept && (
        <DeptOfficersView deptKey={activeDept} onSelectOfficer={goToOfficer} onBack={goToDepts} />
      )}
      {view === 'officer' && activeOfficer && deptMeta && (
        <OfficerDetailPanel officerId={activeOfficer} deptMeta={deptMeta} onBack={() => goToOfficers(activeDept)} />
      )}
    </div>
  );
};

// ─── Departments Tab (enhanced analytics panel) ───────────────────────────────

// Mock data shown when no real data exists
const MOCK_DEPT_STATS = {
  Roads:       { total: 48, resolved: 34, pending: 8,  inProgress: 6,  officers: [{ name: 'Ravi Kumar',    total: 22, resolved: 16, pending: 4,  inProgress: 2 }, { name: 'Sunita Rao',   total: 26, resolved: 18, pending: 4,  inProgress: 4 }] },
  Municipal:   { total: 63, resolved: 41, pending: 14, inProgress: 8,  officers: [{ name: 'Priya Sharma',  total: 30, resolved: 20, pending: 7,  inProgress: 3 }, { name: 'Arjun Mehta',  total: 33, resolved: 21, pending: 7,  inProgress: 5 }] },
  Electricity: { total: 37, resolved: 29, pending: 5,  inProgress: 3,  officers: [{ name: 'Kiran Babu',    total: 37, resolved: 29, pending: 5,  inProgress: 3 }] },
  Water:       { total: 52, resolved: 38, pending: 9,  inProgress: 5,  officers: [{ name: 'Deepa Nair',    total: 26, resolved: 19, pending: 5,  inProgress: 2 }, { name: 'Vijay Anand',  total: 26, resolved: 19, pending: 4,  inProgress: 3 }] },
  Parks:       { total: 21, resolved: 17, pending: 3,  inProgress: 1,  officers: [{ name: 'Meena Pillai',  total: 21, resolved: 17, pending: 3,  inProgress: 1 }] },
};

const DeptAnalyticsCard = ({ dept, stats, isExpanded, onToggle, isMock }) => {
  const d = getDept(dept.key);
  const resRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isExpanded ? `${d.border} shadow-xl` : 'border-transparent shadow-sm hover:shadow-lg'} bg-white`}>
      {/* Card header — clickable */}
      <button
        onClick={onToggle}
        className={`w-full text-left group ${d.bg} p-5 hover:brightness-[0.97] transition-all duration-200 focus:outline-none`}
        style={{ transform: 'none' }}
      >
        {/* Top row: icon + name + expand indicator */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${d.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform duration-200`}>
              {dept.icon}
            </div>
            <div>
              <h3 className={`font-bold text-sm ${d.text}`}>{dept.label}</h3>
              <p className="text-gray-500 text-xs mt-0.5">{dept.description}</p>
            </div>
          </div>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${d.border} ${d.text} transition-all duration-300 ${isExpanded ? 'rotate-180 bg-white' : 'bg-white/60'} text-xs font-bold flex-shrink-0`}>
            ▼
          </div>
        </div>

        {/* Stats badges row */}
        <div className="flex gap-2 flex-wrap mb-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            {stats.total} Total
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {stats.resolved} Resolved
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {stats.pending} Pending
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {stats.inProgress} In Progress
          </span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500 font-medium">Resolution Rate</span>
            <span className={`font-bold ${resRate >= 70 ? 'text-emerald-600' : resRate >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
              {resRate}%
            </span>
          </div>
          <div className="w-full bg-white/70 rounded-full h-2.5 overflow-hidden shadow-inner">
            <div
              className={`bg-gradient-to-r ${d.color} h-2.5 rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${resRate}%` }}
            />
          </div>
        </div>

        {/* Officers count + hint */}
        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs font-semibold ${d.text} opacity-70`}>
            {stats.officers?.length ?? 0} officer{(stats.officers?.length ?? 0) !== 1 ? 's' : ''} assigned
          </span>
          <span className={`text-xs ${d.text} opacity-50 group-hover:opacity-100 transition-opacity font-medium`}>
            {isExpanded ? 'Hide officers ↑' : 'View officers ↓'}
          </span>
        </div>
      </button>

      {/* Expanded officer list */}
      {isExpanded && (
        <div className="bg-white px-5 py-4 border-t border-gray-100 animate-fade-up">
          {isMock && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              <span>⚠️</span>
              <span>No real data available — showing sample stats</span>
            </div>
          )}

          {(!stats.officers || stats.officers.length === 0) ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">{dept.icon}</div>
              <p className="text-sm font-medium">No officers assigned yet</p>
              <p className="text-xs mt-1">Add officers from the Officers tab</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Officer Performance</p>
              {stats.officers.map((officer, idx) => {
                const officerResRate = officer.total > 0 ? Math.round((officer.resolved / officer.total) * 100) : 0;
                const initials = officer.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
                return (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${d.color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{officer.name}</p>
                        <p className="text-gray-400 text-xs">{officer.total} total issues</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${officerResRate >= 70 ? 'bg-emerald-100 text-emerald-700' : officerResRate >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                        {officerResRate}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                      <div className="bg-emerald-50 rounded-lg py-1.5 text-center border border-emerald-100">
                        <p className="font-bold text-emerald-700 text-sm">{officer.resolved}</p>
                        <p className="text-emerald-500 text-[10px]">Resolved</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg py-1.5 text-center border border-amber-100">
                        <p className="font-bold text-amber-700 text-sm">{officer.pending}</p>
                        <p className="text-amber-500 text-[10px]">Pending</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg py-1.5 text-center border border-blue-100">
                        <p className="font-bold text-blue-700 text-sm">{officer.inProgress}</p>
                        <p className="text-blue-500 text-[10px]">In Progress</p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${d.color} h-1.5 rounded-full transition-all duration-700`}
                        style={{ width: `${officerResRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DepartmentsTab = ({ departments, officers, complaints, onSeed, onAdd, t }) => {
  const [expandedDept, setExpandedDept] = useState(null);

  // Compute per-department stats from real data
  const deptStats = useMemo(() => {
    const hasRealData = officers.length > 0 || complaints.length > 0;
    return DEPARTMENTS.map(d => {
      const dbDept = departments.find(dep =>
        dep.name?.toLowerCase().includes(d.key.toLowerCase())
      );
      if (!hasRealData) {
        // Fall back to mock data
        const mock = MOCK_DEPT_STATS[d.key] || { total: 0, resolved: 0, pending: 0, inProgress: 0, officers: [] };
        return { ...d, description: dbDept?.description || d.label, isMock: true, ...mock };
      }

      const dOfficers = officers.filter(o =>
        o.department?.toLowerCase().includes(d.key.toLowerCase())
      );
      const dComplaints = complaints.filter(c =>
        c.category?.toLowerCase().includes(d.key.toLowerCase()) ||
        c.department?.toLowerCase().includes(d.key.toLowerCase())
      );
      const resolved   = dComplaints.filter(c => c.status === 'Resolved').length;
      const pending    = dComplaints.filter(c => c.status === 'Pending').length;
      const inProgress = dComplaints.filter(c => c.status === 'InProgress').length;

      const officerSummaries = dOfficers.map(o => {
        const oc = complaints.filter(c => String(c.officerId?._id || c.officerId) === String(o._id));
        return {
          name: o.name,
          total: oc.length,
          resolved: oc.filter(c => c.status === 'Resolved').length,
          pending: oc.filter(c => c.status === 'Pending').length,
          inProgress: oc.filter(c => c.status === 'InProgress').length,
        };
      });

      return {
        ...d,
        description: dbDept?.description || d.label,
        isMock: false,
        total: dComplaints.length,
        resolved,
        pending,
        inProgress,
        officers: officerSummaries,
      };
    });
  }, [departments, officers, complaints]);

  const isMockData = deptStats.some(d => d.isMock);
  const totalIssues   = deptStats.reduce((s, d) => s + d.total, 0);
  const totalResolved = deptStats.reduce((s, d) => s + d.resolved, 0);
  const overallRate   = totalIssues > 0 ? Math.round((totalResolved / totalIssues) * 100) : 0;

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-lg text-gray-900">{t('departments')} Analytics</h2>
          <p className="text-gray-400 text-sm mt-0.5">Click any department to view officer details</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onSeed} className="btn-secondary text-sm btn-press">{t('seedDepartments')}</button>
          <button onClick={onAdd} className="btn-primary text-sm btn-press">{t('addDepartment')}</button>
        </div>
      </div>

      {/* Summary banner */}
      {isMockData && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <span className="text-lg">📊</span>
          <div>
            <span className="font-semibold">Sample data shown</span>
            <span className="text-amber-600 font-normal"> — seed departments and add officers to see real analytics</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white mb-6">
        {[
          { label: 'Total Issues',  val: totalIssues,       icon: '📋', color: 'text-white'       },
          { label: 'Resolved',      val: totalResolved,     icon: '✅', color: 'text-emerald-400' },
          { label: 'Platform Rate', val: `${overallRate}%`, icon: '📈', color: 'text-sky-400'     },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-xl mb-0.5">{s.icon}</div>
            <p className={`font-bold text-2xl ${s.color}`}>{s.val}</p>
            <p className="text-slate-400 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Department cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deptStats.map((d, i) => (
          <div
            key={d.key}
            className="animate-fade-up"
            style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'both' }}
          >
            <DeptAnalyticsCard
              dept={d}
              stats={d}
              isExpanded={expandedDept === d.key}
              onToggle={() => setExpandedDept(prev => prev === d.key ? null : d.key)}
              isMock={d.isMock}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Existing modals (preserved) ──────────────────────────────────────────────

const AddOfficerModal = ({ onClose, onAdd, departments, t }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', jurisdiction: '' });
  const [err, setErr]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.createOfficer(form); onAdd(); onClose(); }
    catch (err) { setErr(err.response?.data?.message || 'Failed to create officer'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-gray-900">{t('addOfficer')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[['name', t('name'), 'text'], ['email', 'Email', 'email'], ['password', t('password'), 'password']].map(([k, label, type]) => (
            <div key={k}>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
              <input type={type} required value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300" />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('department')}</label>
            <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
              <option value="">Select department</option>
              {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Jurisdiction</label>
            <input type="text" value={form.jurisdiction} onChange={e => setForm(p => ({ ...p, jurisdiction: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          </div>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">{t('addOfficer')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddDeptModal = ({ onClose, onAdd, t }) => {
  const [form, setForm] = useState({ name: '', description: '' });
  const [err, setErr]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.createDepartment(form); onAdd(); onClose(); }
    catch { setErr('Failed to create department'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-gray-900">{t('addDepartment')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('deptName')}</label>
            <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('deptDescription')}</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none" />
          </div>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">{t('addDepartment')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SlaRuleModal = ({ onClose, onSave, editing, departments, t }) => {
  const [form, setForm] = useState(editing ?? { category: '', maxHours: 72, description: '' });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-gray-900">{editing ? t('editSlaRule') : t('addSlaRule')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('category')}</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">{t('selectCategory')}</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('maxHours')}</label>
            <input type="number" min="1" value={form.maxHours} onChange={e => setForm(p => ({ ...p, maxHours: Number(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('description')}</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
            <button onClick={() => onSave(form)} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Dept-filtered assignment row ────────────────────────────────────────────
// Extracted to avoid re-rendering the whole table on every dropdown open.
const ComplaintAssignRow = React.memo(({ c, officersByDept, handleAssignComplaint, t, index }) => {
  const deptKey = c.department || c.category || '';

  // Case-insensitive match: officer.department may be stored with different casing
  const deptOfficers = useMemo(() => {
    const key = deptKey.toLowerCase();
    // Try exact key first, then fuzzy match
    for (const [k, list] of Object.entries(officersByDept)) {
      if (k.toLowerCase() === key) return list;
    }
    // fallback: partial match (e.g. "Municipal" ↔ "Municipality")
    for (const [k, list] of Object.entries(officersByDept)) {
      if (k.toLowerCase().includes(key) || key.includes(k.toLowerCase())) return list;
    }
    return [];
  }, [officersByDept, deptKey]);

  const hasOfficers = deptOfficers.length > 0;

  const deptMeta = DEPARTMENTS.find(d =>
    d.key.toLowerCase() === deptKey.toLowerCase() ||
    deptKey.toLowerCase().includes(d.key.toLowerCase())
  );

  return (
    <tr
      className="tr-hover animate-fade-up"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
    >
      <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">{c.title}</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-gray-600 text-xs">
          {deptMeta && <span>{deptMeta.icon}</span>}
          {c.category}
        </span>
      </td>
      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
      <td className="px-4 py-3"><span className={`priority-${c.priority?.toLowerCase()}`}>{c.priority}</span></td>
      <td className="px-4 py-3 text-gray-600">{c.votes}</td>
      <td className="px-4 py-3 text-gray-600 text-xs">
        {c.officerId?.name
          ? <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {c.officerId.name}
            </span>
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3">
        {hasOfficers ? (
          <select
            defaultValue=""
            onChange={e => { if (e.target.value) handleAssignComplaint(c._id, e.target.value); }}
            className="text-xs border border-purple-200 bg-white rounded-xl px-2 py-1.5 focus:outline-none input-glow transition-colors hover:border-purple-400"
            title={`${deptOfficers.length} officer${deptOfficers.length !== 1 ? 's' : ''} in ${deptKey}`}
          >
            <option value="">{t('assignLabel')} ({deptOfficers.length})</option>
            {deptOfficers.map(o => (
              <option key={o._id} value={o._id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-gray-400 italic flex items-center gap-1">
            <span>⚠️</span>
            {t('noOfficersForDept') || 'No officers in dept'}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs">
        {new Date(c.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
});

// ─── Main AdminDashboard ──────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { t, lang } = useLang();
  const TAB_KEYS = ['analytics', 'performance', 'complaints', 'officers', 'departments', 'citizens', 'slaRules'];

  const [tab, setTab]                     = useState('analytics');
  const [analytics, setAnalytics]         = useState(null);
  const [rawComplaints, setRawComplaints] = useState([]);
  const [complaints, setComplaints]       = useState([]);
  const [officers, setOfficers]           = useState([]);
  const [departments, setDepartments]     = useState([]);
  const [citizens, setCitizens]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [translating, setTranslating]     = useState(false);
  const prevLang                          = useRef(lang);
  const [complaintFilter, setComplaintFilter] = useState('none'); // 'none' | 'all' | 'Pending' | 'Resolved' | 'InProgress'
  const [showAddOfficer, setShowAddOfficer] = useState(false);
  const [showAddDept, setShowAddDept]       = useState(false);
  const [slaRules, setSlaRules]             = useState(getSlaRules());
  const [showSlaModal, setShowSlaModal]     = useState(false);
  const [editingSla, setEditingSla]         = useState(null);

  const applyTranslation = async (data, targetLang) => {
    if (targetLang === 'en') { setComplaints(data); return; }
    setTranslating(true);
    try { const tr = await translateComplaints(data, targetLang); setComplaints(tr); }
    catch { setComplaints(data); }
    finally { setTranslating(false); }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (prevLang.current === lang) return;
    prevLang.current = lang;
    if (rawComplaints.length > 0) applyTranslation(rawComplaints, lang);
  }, [lang, rawComplaints]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aRes, cRes, oRes, dRes, ctRes] = await Promise.all([
        api.getAnalytics(), api.getAdminComplaints(),
        api.getOfficers(), api.getDepartments(), api.getCitizens(),
      ]);
      setAnalytics(aRes.data);
      setRawComplaints(cRes.data);
      await applyTranslation(cRes.data, lang);
      setOfficers(oRes.data);
      setDepartments(dRes.data);
      setCitizens(ctRes.data);
    } catch (err) { console.error('Admin fetch error', err); }
    setLoading(false);
  };

  const handleSeedDepts = async () => {
    try { await api.seedDepartments(); fetchAll(); alert('Default departments seeded!'); } catch {}
  };

  // ── Pre-group officers by department key (single pass, memoized) ────────────
  // Handles both exact matches (Roads → Roads) and label matches (Municipal → Municipality)
  const officersByDept = useMemo(() => {
    const map = {};
    for (const o of officers) {
      const dept = (o.department || '').trim();
      if (!dept) continue;
      if (!map[dept]) map[dept] = [];
      map[dept].push(o);
    }
    return map;
  }, [officers]);
  const handleDeleteOfficer = async (id) => {
    if (!confirm(t('deleteOfficer'))) return;
    try { await api.deleteOfficer(id); fetchAll(); } catch {}
  };
  const handleAssignComplaint = async (complaintId, officerId) => {
    try { await api.assignComplaint(complaintId, officerId); fetchAll(); } catch {}
  };
  const handleSaveSla = (rule) => {
    const updated = rule.id
      ? slaRules.map(r => r.id === rule.id ? rule : r)
      : [...slaRules, { ...rule, id: Date.now().toString() }];
    setSlaRules(updated); saveSlaRules(updated); setShowSlaModal(false); setEditingSla(null);
  };
  const handleDeleteSla = (id) => {
    const updated = slaRules.filter(r => r.id !== id);
    setSlaRules(updated); saveSlaRules(updated);
  };

  const tabLabels = {
    analytics: t('analytics'), performance: '📊 Performance', complaints: t('complaints'),
    officers: t('officers'), departments: t('departments'), citizens: t('citizens'), slaRules: t('slaRules'),
  };

  if (loading) return (
    <div className="min-h-screen bg-admin">
      <Navbar role="admin" />
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-admin">
      <Navbar role="admin" />
      {showAddOfficer && <AddOfficerModal onClose={() => setShowAddOfficer(false)} onAdd={fetchAll} departments={departments} t={t} />}
      {showAddDept    && <AddDeptModal    onClose={() => setShowAddDept(false)} onAdd={fetchAll} t={t} />}
      {showSlaModal   && <SlaRuleModal    onClose={() => { setShowSlaModal(false); setEditingSla(null); }} onSave={handleSaveSla} editing={editingSla} departments={departments} t={t} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-page-enter">
        <div className="flex items-center justify-between mb-6 animate-fade-up d0">
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900">{t('adminPanelTitle')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('manageEntire')}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white rounded-2xl p-1 border border-purple-100/60 shadow-sm mb-6 overflow-x-auto animate-fade-up d1">
          {TAB_KEYS.map(key => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`flex-shrink-0 py-2.5 px-3 rounded-xl text-xs font-semibold font-display transition-all duration-200 btn-press ${
                tab === key ? 'bg-purple-500 text-white shadow scale-[1.03]' : 'text-gray-500 hover:text-gray-700 hover:bg-purple-50/50'
              }`}>
              {tabLabels[key]}
            </button>
          ))}
        </div>

        {/* ── Performance Tab (NEW) ── */}
        {tab === 'performance' && (
          <PerformanceTab officers={officers} complaints={rawComplaints} />
        )}

        {/* ── Analytics Tab ── */}
        {tab === 'analytics' && analytics && (
          <div className="space-y-6 animate-fade-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t('totalComplaints'), value: analytics.totalComplaints,      icon: '📊', color: 'from-blue-500 to-blue-600',     filter: 'all'        },
                { label: t('resolvedStat'),    value: analytics.resolvedComplaints,   icon: '✅', color: 'from-emerald-500 to-emerald-600', filter: 'Resolved'   },
                { label: t('pending'),         value: analytics.pendingComplaints,    icon: '⏳', color: 'from-amber-500 to-amber-600',    filter: 'Pending'    },
                { label: t('inProgress'),      value: analytics.inProgressComplaints, icon: '🔧', color: 'from-indigo-500 to-indigo-600',  filter: 'InProgress' },
              ].map((s, i) => (
                <AnalyticsCard
                  key={s.label} {...s} index={i}
                  isActive={complaintFilter === s.filter}
                  onClick={() => setComplaintFilter(prev => prev === s.filter && s.filter !== 'all' ? 'none' : s.filter)}
                />
              ))}
            </div>

            {/* Filtered complaints panel — shown for all filter values except 'none' */}
            {complaintFilter !== 'none' && (() => {
              const filtered = complaintFilter === 'all'
                ? rawComplaints
                : rawComplaints.filter(c => c.status === complaintFilter);
              const filterMeta = {
                all:        { label: 'All Complaints',          icon: '📊', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'    },
                Resolved:   { label: 'Resolved Complaints',    icon: '✅', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                Pending:    { label: 'Pending Complaints',     icon: '⏳', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
                InProgress: { label: 'In-Progress Complaints', icon: '🔧', color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200'  },
              }[complaintFilter];
              return (
                <div className={`${filterMeta.bg} border ${filterMeta.border} rounded-2xl overflow-hidden animate-fade-up`}>
                  <div className="px-5 py-4 border-b border-white/60 flex items-center justify-between">
                    <h3 className={`font-bold text-base ${filterMeta.color} flex items-center gap-2`}>
                      <span>{filterMeta.icon}</span>
                      {filterMeta.label}
                      <span className="ml-1 bg-white/70 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{filtered.length}</span>
                    </h3>
                    <button onClick={() => setComplaintFilter('none')} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-white/60 transition-colors">✕ Clear</button>
                  </div>
                  {filtered.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">No complaints in this category.</div>
                  ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      <table className="w-full text-sm">
                        <thead className="bg-white/50 sticky top-0">
                          <tr>
                            {['Title', 'Category', 'Priority', 'Votes', 'Assigned To', 'Date'].map(h => (
                              <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/40">
                          {filtered.map((c, i) => (
                            <tr key={c._id} className="hover:bg-white/40 transition-colors animate-fade-up" style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
                              <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[200px] truncate">{c.title}</td>
                              <td className="px-4 py-2.5 text-gray-600">{c.category || '—'}</td>
                              <td className="px-4 py-2.5"><span className={`priority-${c.priority?.toLowerCase()}`}>{c.priority}</span></td>
                              <td className="px-4 py-2.5 text-gray-600">{c.votes}</td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs">{c.officerId?.name || '—'}</td>
                              <td className="px-4 py-2.5 text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5 card-lift animate-fade-up d2">
                <h3 className="font-display font-semibold text-gray-800 mb-1">{t('resolutionRate')}</h3>
                <div className="text-4xl font-bold text-emerald-600 mb-2 stat-card-num">{analytics.resolutionRate}%</div>
                <ProgressBar value={analytics.resolutionRate} total={100} color="bg-emerald-500" />
              </div>
              <div className="card p-5 card-lift animate-fade-up d3">
                <h3 className="font-display font-semibold text-gray-800 mb-1">{t('slaBreaches')}</h3>
                <div className={`text-4xl font-bold mb-2 stat-card-num ${analytics.slaBreaches > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {analytics.slaBreaches}
                </div>
                <p className="text-gray-500 text-xs">{analytics.slaBreaches > 0 ? t('complaintsPassDeadline') : t('allOnTrack')}</p>
              </div>
              <div className="card p-5 card-lift animate-fade-up d4">
                <h3 className="font-display font-semibold text-gray-800 mb-3">{t('platformUsers')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">{t('citizens')}</span><span className="font-semibold">{analytics.totalCitizens}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">{t('officers')}</span><span className="font-semibold">{analytics.totalOfficers}</span></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-5 card-lift animate-fade-up d2">
                <h3 className="font-display font-semibold text-gray-800 mb-4">{t('categoryBreakdown')}</h3>
                <div className="space-y-2.5">
                  {analytics.categoryStats?.map((cat, i) => (
                    <div key={cat._id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat._id || 'Other'}</span>
                        <span className="font-semibold text-gray-800">{cat.count}</span>
                      </div>
                      <ProgressBar value={cat.count} total={analytics.totalComplaints} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-5 card-lift animate-fade-up d3">
                <h3 className="font-display font-semibold text-gray-800 mb-4">{t('topOfficers')}</h3>
                <div className="space-y-3">
                  {analytics.officerPerformance?.slice(0, 5).map((op, i) => (
                    <div key={i} className="flex items-center justify-between animate-fade-up" style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'both' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-xs font-bold text-teal-700">{i + 1}</div>
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{op.name}</p>
                          <p className="text-xs text-gray-400">{op.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">{op.resolved} resolved</p>
                        <p className="text-xs text-gray-400">{op.total} total</p>
                      </div>
                    </div>
                  ))}
                  {!analytics.officerPerformance?.length && <p className="text-gray-400 text-sm text-center py-3">{t('noDataYet')}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Complaints Tab ── */}
        {tab === 'complaints' && (
          <div className="card animate-fade-up">
            <div className="p-5 border-b border-purple-100/60 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display font-bold text-lg text-gray-900">
                  {t('allComplaints')} ({complaints.length})
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Officers shown per row are filtered to match the complaint's department
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-50/60">
                  <tr>
                    {[t('title'), t('category'), t('statusLabel'), t('priority'), t('votes'), t('officers'), t('assign'), t('date')].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50">
                  {complaints.map((c, i) => (
                    <ComplaintAssignRow
                      key={c._id}
                      c={c}
                      index={i}
                      officersByDept={officersByDept}
                      handleAssignComplaint={handleAssignComplaint}
                      t={t}
                    />
                  ))}
                </tbody>
              </table>
              {complaints.length === 0 && (
                <div className="p-12 text-center text-gray-400">{t('noComplaintsYet')}</div>
              )}
            </div>
          </div>
        )}

        {/* ── Officers Tab ── */}
        {tab === 'officers' && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-gray-900">{t('officers')} ({officers.length})</h2>
              <button onClick={() => setShowAddOfficer(true)} className="btn-primary text-sm btn-press">{t('addOfficer')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {officers.map((o, i) => (
                <div key={o._id} className="card p-5 card-lift animate-fade-up" style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'both' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-lg">👮</div>
                      <div>
                        <p className="font-display font-semibold text-gray-900">{o.name}</p>
                        <p className="text-gray-400 text-xs">{o.email}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteOfficer(o._id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs btn-press">✕</button>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">{t('department')}</span><span className="font-medium text-gray-800">{o.department || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Jurisdiction</span><span className="font-medium text-gray-800 text-right max-w-[120px] truncate">{o.jurisdiction || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">{t('statusLabel')}</span><span className={`font-medium ${o.isActive ? 'text-emerald-600' : 'text-red-500'}`}>{o.isActive ? t('active') : t('inactive')}</span></div>
                  </div>
                </div>
              ))}
            </div>
            {officers.length === 0 && (
              <div className="card p-12 text-center animate-scale-in">
                <div className="text-5xl mb-3">👮</div>
                <p className="text-gray-400 font-medium mb-3">{t('noOfficersYet')}</p>
                <button onClick={() => setShowAddOfficer(true)} className="btn-primary btn-press">{t('addFirstOfficer')}</button>
              </div>
            )}
          </div>
        )}

        {/* ── Departments Tab ── */}
        {tab === 'departments' && (
          <DepartmentsTab
            departments={departments}
            officers={officers}
            complaints={rawComplaints}
            onSeed={handleSeedDepts}
            onAdd={() => setShowAddDept(true)}
            t={t}
          />
        )}

        {/* ── Citizens Tab ── */}
        {tab === 'citizens' && (
          <div className="card animate-fade-up">
            <div className="p-5 border-b border-purple-100/60">
              <h2 className="font-display font-bold text-lg text-gray-900">{t('citizens')} ({citizens.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-50/60">
                  <tr>
                    {[t('name'), 'Email', t('statusLabel'), t('date')].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50">
                  {citizens.map((c, i) => (
                    <tr key={c._id} className="tr-hover animate-fade-up" style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                      <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.email}</td>
                      <td className="px-4 py-3"><span className={`font-medium ${c.isActive ? 'text-emerald-600' : 'text-red-500'}`}>{c.isActive ? t('active') : t('inactive')}</span></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SLA Rules Tab ── */}
        {tab === 'slaRules' && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-gray-900">{t('slaRules')} ({slaRules.length})</h2>
              <button onClick={() => setShowSlaModal(true)} className="btn-primary text-sm btn-press">{t('addSlaRule')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slaRules.map((rule, i) => (
                <div key={rule.id} className="card p-5 card-lift animate-fade-up" style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'both' }}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-display font-semibold text-gray-900">{rule.category || '—'}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingSla(rule); setShowSlaModal(true); }} className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-colors text-xs">✏️</button>
                      <button onClick={() => handleDeleteSla(rule.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors text-xs">🗑️</button>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-indigo-600 mb-1">{rule.maxHours}h</p>
                  <p className="text-gray-400 text-xs">{rule.description || t('noDescription')}</p>
                </div>
              ))}
              {slaRules.length === 0 && (
                <div className="col-span-full card p-12 text-center animate-scale-in">
                  <div className="text-5xl mb-3">⏱️</div>
                  <p className="text-gray-400 font-medium">{t('noSlaRules')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
