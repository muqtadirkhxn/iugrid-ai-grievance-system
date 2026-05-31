import { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/auth-store';
import { fetchComplaints, updateComplaintStatus, fetchAIProcessing, isDatabaseAvailable } from '../lib/data-layer';
import type { Complaint, ComplaintStatus, ComplaintCategory, ComplaintPriority, AIProcessing } from '../types';
import { BarChart3, FileText, Clock, AlertCircle, CheckCircle, X, Filter, TrendingUp, Wifi, WifiOff, Brain, Zap, MapPin, Shield, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import Header from '../components/Header';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ComplaintPriority | 'all'>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('Pending');
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState(false);
  const [usingLocal, setUsingLocal] = useState(false);
  const [expandedComplaint, setExpandedComplaint] = useState<string | null>(null);
  const [aiDetails, setAiDetails] = useState<AIProcessing | null>(null);
  const [stats, setStats] = useState({
    total: 0, pending: 0, inProgress: 0, resolved: 0,
    high: 0, medium: 0, low: 0,
    academic: 0, hostel: 0, administrative: 0, technical: 0,
    avgSentiment: 0, angryCount: 0, frustratedCount: 0,
  });

  useEffect(() => { loadComplaints(); }, [user]);

  const loadComplaints = async () => {
    try {
      const dbOk = await isDatabaseAvailable();
      setUsingLocal(!dbOk);
      const data = await fetchComplaints(undefined, true);
      setComplaints(data);
      calculateStats(data);
    } catch {
      console.error('Error fetching complaints');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Complaint[]) => {
    setStats({
      total: data.length,
      pending: data.filter(c => c.status === 'Pending').length,
      inProgress: data.filter(c => c.status === 'In Progress').length,
      resolved: data.filter(c => c.status === 'Resolved').length,
      high: data.filter(c => c.priority === 'High').length,
      medium: data.filter(c => c.priority === 'Medium').length,
      low: data.filter(c => c.priority === 'Low').length,
      academic: data.filter(c => c.category === 'Academic').length,
      hostel: data.filter(c => c.category === 'Hostel').length,
      administrative: data.filter(c => c.category === 'Administrative').length,
      technical: data.filter(c => c.category === 'Technical').length,
      avgSentiment: 0, angryCount: 0, frustratedCount: 0,
    });
  };

  const handleUpdateStatus = async () => {
    if (!selectedComplaint || !user) return;
    setUpdating(true);
    try {
      await updateComplaintStatus(selectedComplaint.id, newStatus, user.id, remarks || `Status updated to ${newStatus}`);
      setShowModal(false);
      setSelectedComplaint(null);
      setNewStatus('Pending');
      setRemarks('');
      loadComplaints();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const loadAiDetails = async (complaintId: string) => {
    if (expandedComplaint === complaintId) { setExpandedComplaint(null); return; }
    setExpandedComplaint(complaintId);
    const details = await fetchAIProcessing(complaintId);
    setAiDetails(details);
  };

  const filteredComplaints = complaints.filter(c => {
    const categoryMatch = categoryFilter === 'all' || c.category === categoryFilter;
    const priorityMatch = priorityFilter === 'all' || c.priority === priorityFilter;
    return categoryMatch && priorityMatch;
  });

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getPriorityColor = (priority?: ComplaintPriority) => {
    if (!priority) return 'bg-gray-100 text-gray-800 border-gray-200';
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getCategoryColor = (category?: ComplaintCategory) => {
    if (!category) return 'bg-gray-100 text-gray-800 border-gray-200';
    const colors: Record<string, string> = {
      Academic: 'bg-blue-100 text-blue-800 border-blue-200',
      Hostel: 'bg-teal-100 text-teal-800 border-teal-200',
      Administrative: 'bg-orange-100 text-orange-800 border-orange-200',
      Technical: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    };
    return colors[category];
  };

  const getSentimentIcon = (tone?: string) => {
    switch (tone) {
      case 'angry': return '🔴';
      case 'frustrated': return '🟠';
      case 'concerned': return '🟡';
      case 'neutral': return '⚪';
      case 'hopeful': return '🟢';
      default: return '⚪';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const total = stats.total || 1;
  const highPercentage = Math.round((stats.high / total) * 100);
  const mediumPercentage = Math.round((stats.medium / total) * 100);
  const lowPercentage = Math.round((stats.low / total) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage and track all grievances with AI insights</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${usingLocal ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {usingLocal ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {usingLocal ? 'Local Storage' : 'Cloud Synced'}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600 mb-1">Total Complaints</p><p className="text-3xl font-bold text-gray-900">{stats.total}</p></div>
              <FileText className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600 mb-1">Pending</p><p className="text-3xl font-bold text-gray-900">{stats.pending}</p></div>
              <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600 mb-1">In Progress</p><p className="text-3xl font-bold text-gray-900">{stats.inProgress}</p></div>
              <AlertCircle className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600 mb-1">Resolved</p><p className="text-3xl font-bold text-gray-900">{stats.resolved}</p></div>
              <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Priority Distribution</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'High Priority', count: stats.high, pct: highPercentage, color: 'bg-red-600', textColor: 'text-red-600' },
                { label: 'Medium Priority', count: stats.medium, pct: mediumPercentage, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
                { label: 'Low Priority', count: stats.low, pct: lowPercentage, color: 'bg-green-500', textColor: 'text-green-600' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className={`text-sm font-bold ${item.textColor}`}>{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`${item.color} h-2.5 rounded-full transition-all`} style={{ width: `${item.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-900">Academic</p>
                <p className="text-2xl font-bold text-blue-600">{stats.academic}</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-3">
                <p className="text-xs text-teal-900">Hostel</p>
                <p className="text-2xl font-bold text-teal-600">{stats.hostel}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-orange-900">Administrative</p>
                <p className="text-2xl font-bold text-orange-600">{stats.administrative}</p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3">
                <p className="text-xs text-cyan-900">Technical</p>
                <p className="text-2xl font-bold text-cyan-600">{stats.technical}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-red-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔴</span>
                  <p className="text-xs text-red-900">Angry Sentiment</p>
                </div>
                <p className="text-sm font-bold text-red-600">{stats.angryCount}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟠</span>
                  <p className="text-xs text-orange-900">Frustrated Sentiment</p>
                </div>
                <p className="text-sm font-bold text-orange-600">{stats.frustratedCount}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-blue-900">AI-Processed</p>
                </div>
                <p className="text-sm font-bold text-blue-600">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">All Complaints</h2>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            <div className="flex gap-3">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as ComplaintCategory | 'all')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                <option value="all">All Categories</option>
                <option value="Academic">Academic</option>
                <option value="Hostel">Hostel</option>
                <option value="Administrative">Administrative</option>
                <option value="Technical">Technical</option>
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as ComplaintPriority | 'all')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                <option value="all">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredComplaints.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">No complaints found</div>
            ) : (
              filteredComplaints.map((complaint) => (
                <div key={complaint.id}>
                  <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 cursor-pointer" onClick={() => loadAiDetails(complaint.id)}>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900">{complaint.title}</h3>
                          <span className="text-gray-400">
                            {expandedComplaint === complaint.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 line-clamp-1">{complaint.description}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(complaint.status)}`}>{complaint.status}</span>
                          {complaint.priority && <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(complaint.priority)}`}>{complaint.priority}</span>}
                          {complaint.category && <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(complaint.category)}`}>{complaint.category}</span>}
                          <span className="text-xs text-gray-400">{formatDate(complaint.created_at)}</span>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedComplaint(complaint); setNewStatus(complaint.status); setRemarks(''); setShowModal(true); }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors whitespace-nowrap">
                        Update
                      </button>
                    </div>
                  </div>

                  {/* Expanded AI Details */}
                  {expandedComplaint === complaint.id && aiDetails && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-bold text-gray-900">AI Analysis Report</h4>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{aiDetails.confidence_score}% confidence</span>
                        {aiDetails.duplicate_warning && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Duplicate Flag
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                        {Object.entries(aiDetails.category_scores).map(([cat, score]) => (
                          <div key={cat} className={`rounded-lg p-2 ${cat === aiDetails.category_detected ? 'ring-2 ring-blue-400 bg-blue-50' : 'bg-white'}`}>
                            <p className="text-xs text-gray-600">{cat}</p>
                            <div className="flex items-end gap-1">
                              <p className="text-sm font-bold text-gray-900">{score}</p>
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5 mb-1">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, score * 10)}%` }}></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1"><Activity className="w-3 h-3" /> Sentiment</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getSentimentIcon(aiDetails.sentiment_tone)}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900 capitalize">{aiDetails.sentiment_tone}</p>
                              <p className="text-xs text-gray-500">Score: {Math.round(aiDetails.sentiment_score * 100)}%</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Entities</p>
                          {aiDetails.entities?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {aiDetails.entities.map((entity, i) => (
                                <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">{entity.value} ({entity.type})</span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">No entities detected</p>
                          )}
                        </div>

                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1"><Shield className="w-3 h-3" /> Actions</p>
                          {aiDetails.suggestions?.length > 0 ? (
                            <div className="space-y-1">
                              {aiDetails.suggestions.slice(0, 3).map((s, i) => (
                                <p key={i} className="text-xs text-gray-700"><span className="font-bold text-blue-600">{i + 1}.</span> {s.action}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">No suggestions</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Update Modal */}
      {showModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Update Complaint Status</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{selectedComplaint.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{selectedComplaint.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-sm text-gray-900">{selectedComplaint.category || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <p className="text-sm text-gray-900">{selectedComplaint.priority || '-'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedComplaint.status)}`}>{selectedComplaint.status}</span>
              </div>
              <div>
                <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                <select id="newStatus" value={newStatus} onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Add remarks or comments..." />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleUpdateStatus} disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
