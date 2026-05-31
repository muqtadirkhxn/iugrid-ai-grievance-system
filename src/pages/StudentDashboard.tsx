import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../lib/auth-store";
import {
  fetchComplaints,
  createComplaint,
  fetchAIProcessing,
  isDatabaseAvailable,
  deleteComplaint,
} from "../lib/data-layer";
import { analyzeLive } from "../lib/nlp-processor";
import type {
  Complaint,
  ComplaintStatus,
  ComplaintCategory,
  ComplaintPriority,
  AIProcessing,
  LivePreview,
  DuplicateMatch,
} from "../types";
import {
  Plus,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Filter,
  Wifi,
  WifiOff,
  Brain,
  Zap,
  Eye,
  Copy,
  Shield,
  MapPin,
  Tag,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import Header from "../components/Header";

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | "all">(
    "all",
  );
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [usingLocal, setUsingLocal] = useState(false);
  const [livePreview, setLivePreview] = useState<LivePreview | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [expandedComplaint, setExpandedComplaint] = useState<string | null>(
    null,
  );
  const [aiDetails, setAiDetails] = useState<AIProcessing | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, [user]);

  const loadComplaints = async () => {
    if (!user) return;
    try {
      const dbOk = await isDatabaseAvailable();
      setUsingLocal(!dbOk);
      const data = await fetchComplaints(user.id);
      setComplaints(data);
      calculateStats(data);
    } catch {
      console.error("Error fetching complaints");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Complaint[]) => {
    setStats({
      total: data.length,
      pending: data.filter((c) => c.status === "Pending").length,
      inProgress: data.filter((c) => c.status === "In Progress").length,
      resolved: data.filter((c) => c.status === "Resolved").length,
    });
  };

  const updateLivePreview = useCallback(() => {
    if (!title && !description) {
      setLivePreview(null);
      return;
    }
    const preview = analyzeLive(title, description);
    setLivePreview(preview);
  }, [title, description]);

  useEffect(() => {
    updateLivePreview();
  }, [title, description, updateLivePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (cleanTitle.length < 5) {
      alert("Complaint title must be at least 5 characters long.");
      return;
    }

    if (cleanTitle.length > 100) {
      alert("Complaint title cannot exceed 100 characters.");
      return;
    }

    if (!/^[A-Za-z0-9\s.,!?'"()\-&]+$/.test(cleanTitle)) {
      alert("Complaint title contains invalid characters.");
      return;
    }

    const meaningfulWordsTitle = cleanTitle
      .split(" ")
      .filter((word) => word.length >= 3);

    if (meaningfulWordsTitle.length < 2) {
      alert("Please enter a meaningful complaint title.");
      return;
    }

    if (cleanDescription.length < 20) {
      alert("Complaint description must be at least 20 characters long.");
      return;
    }

    if (cleanDescription.length > 1000) {
      alert("Complaint description cannot exceed 1000 characters.");
      return;
    }

    if (!/[A-Za-z]/.test(cleanDescription)) {
      alert("Complaint description must contain meaningful text.");
      return;
    }

    const meaningfulWordsDescription = cleanDescription
      .split(/\s+/)
      .filter((word) => word.length >= 3);

    if (meaningfulWordsDescription.length < 5) {
      alert(
        "Please provide a meaningful complaint description with enough detail.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const result = await createComplaint(
        user.id,
        cleanTitle,
        cleanDescription,
      );

      if (
        result.duplicates.length > 0 &&
        result.duplicates[0].similarity >= 0.7
      ) {
        setDuplicates(result.duplicates);
        setShowDuplicateWarning(true);
      }

      setTitle("");
      setDescription("");
      setLivePreview(null);
      setShowForm(false);

      await loadComplaints();
    } catch (error) {
      console.error("Error submitting complaint:", error);
      alert("Failed to submit complaint. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadAiDetails = async (complaintId: string) => {
    if (expandedComplaint === complaintId) {
      setExpandedComplaint(null);
      return;
    }

    setExpandedComplaint(complaintId);

    const details = await fetchAIProcessing(complaintId);

    console.log("AI DETAILS:", details);

    setAiDetails(details);
  };

  const handleDeleteComplaint = async (complaintId: string) => {
    if (!user) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this complaint?",
    );

    if (!confirmed) return;

    try {
      await deleteComplaint(complaintId, user.id);

      // close expanded panel if deleting open complaint
      if (expandedComplaint === complaintId) {
        setExpandedComplaint(null);
        setAiDetails(null);
      }

      await loadComplaints();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete complaint.");
    }
  };

  const filteredComplaints =
    statusFilter === "all"
      ? complaints
      : complaints.filter((c) => c.status === statusFilter);

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case "Pending":
        return "bg-amber-50 text-amber-700 border border-amber-200 ring-1 ring-amber-100";
      case "In Progress":
        return "bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-100";
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100";
    }
  };

  const getPriorityColor = (priority?: ComplaintPriority) => {
    if (!priority) return "bg-slate-50 text-slate-600 border border-slate-200";
    switch (priority) {
      case "High":
        return "bg-red-50 text-red-700 border border-red-200 ring-1 ring-red-100";
      case "Medium":
        return "bg-amber-50 text-amber-700 border border-amber-200 ring-1 ring-amber-100";
      case "Low":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100";
    }
  };

  const getCategoryColor = (category?: ComplaintCategory) => {
    if (!category) return "bg-slate-50 text-slate-600 border border-slate-200";
    const colors: Record<string, string> = {
      Academic:
        "bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-100",
      Hostel:
        "bg-teal-50 text-teal-700 border border-teal-200 ring-1 ring-teal-100",
      Administrative:
        "bg-orange-50 text-orange-700 border border-orange-200 ring-1 ring-orange-100",
      Technical:
        "bg-cyan-50 text-cyan-700 border border-cyan-200 ring-1 ring-cyan-100",
    };
    return colors[category];
  };

  const getSentimentIcon = (tone?: string) => {
    switch (tone) {
      case "angry":
        return "🔴";
      case "frustrated":
        return "🟠";
      case "concerned":
        return "🟡";
      case "neutral":
        return "⚪";
      case "hopeful":
        return "🟢";
      default:
        return "⚪";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="w-11 h-11 border-[3px] border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide text-slate-400">
          Loading dashboard…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />

      <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* ── Welcome Bar ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Welcome back, <span className="text-[#2563EB]">{user?.name}</span>
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Submit and track your grievances in real-time
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border ${
              usingLocal
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {usingLocal ? (
              <WifiOff className="w-3.5 h-3.5" />
            ) : (
              <Wifi className="w-3.5 h-3.5" />
            )}
            {usingLocal ? "Local Storage" : "Cloud Synced"}
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 gap-5 mb-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Total */}
          <div className="group relative bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200 p-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/4 to-transparent pointer-events-none rounded-2xl" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B] mb-2">
                  Total
                </p>
                <p className="text-4xl font-bold text-[#0F172A]">
                  {stats.total}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#2563EB]/10 flex items-center justify-center group-hover:bg-[#2563EB]/15 transition-colors">
                <FileText className="w-5 h-5 text-[#2563EB]" />
              </div>
            </div>
            <div className="mt-4 h-1 rounded-full bg-[#E2E8F0]">
              <div
                className="h-1 rounded-full bg-[#2563EB]"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Pending */}
          <div className="group relative bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200 p-6 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-amber-400/5 to-transparent rounded-2xl" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B] mb-2">
                  Pending
                </p>
                <p className="text-4xl font-bold text-[#0F172A]">
                  {stats.pending}
                </p>
              </div>
              <div className="flex items-center justify-center transition-colors w-11 h-11 rounded-xl bg-amber-50 group-hover:bg-amber-100">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div className="mt-4 h-1 rounded-full bg-[#E2E8F0]">
              <div
                className="h-1 rounded-full bg-amber-400"
                style={{
                  width: stats.total
                    ? `${(stats.pending / stats.total) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>

          {/* In Progress */}
          <div className="group relative bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200 p-6 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-blue-400/5 to-transparent rounded-2xl" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B] mb-2">
                  In Progress
                </p>
                <p className="text-4xl font-bold text-[#0F172A]">
                  {stats.inProgress}
                </p>
              </div>
              <div className="flex items-center justify-center transition-colors w-11 h-11 rounded-xl bg-blue-50 group-hover:bg-blue-100">
                <AlertCircle className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 h-1 rounded-full bg-[#E2E8F0]">
              <div
                className="h-1 bg-blue-500 rounded-full"
                style={{
                  width: stats.total
                    ? `${(stats.inProgress / stats.total) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>

          {/* Resolved */}
          <div className="group relative bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all duration-200 p-6 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-emerald-400/5 to-transparent rounded-2xl" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B] mb-2">
                  Resolved
                </p>
                <p className="text-4xl font-bold text-[#0F172A]">
                  {stats.resolved}
                </p>
              </div>
              <div className="flex items-center justify-center transition-colors w-11 h-11 rounded-xl bg-emerald-50 group-hover:bg-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4 h-1 rounded-full bg-[#E2E8F0]">
              <div
                className="h-1 rounded-full bg-emerald-500"
                style={{
                  width: stats.total
                    ? `${(stats.resolved / stats.total) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Submit Form + Live AI Preview ── */}
        {showForm && (
          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
            {/* Form */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm lg:col-span-2 p-7">
              <h2 className="flex items-center gap-2.5 mb-6 text-lg font-bold text-[#0F172A]">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-[#2563EB]" />
                </div>
                Submit New Complaint
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="title"
                    className="block mb-1.5 text-sm font-semibold text-[#374151]"
                  >
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-150"
                    placeholder="Brief title of your complaint"
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block mb-1.5 text-sm font-semibold text-[#374151]"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-150 resize-none"
                    placeholder="Describe your complaint in detail…"
                  />
                </div>
                {livePreview?.qualityWarning && (
                  <div className="flex items-start gap-3 p-3.5 border border-amber-200 rounded-xl bg-amber-50">
                    <AlertCircle className="flex-shrink-0 w-4 h-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-700">
                      {livePreview.qualityWarning}
                    </p>
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-[#2563EB] hover:bg-[#1E40AF] text-white py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    {submitting ? "Submitting…" : "Submit Complaint"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setTitle("");
                      setDescription("");
                      setLivePreview(null);
                    }}
                    className="px-6 py-3 border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all duration-150 active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Live AI Preview Panel */}
            <div className="bg-white rounded-2xl border border-[#2563EB]/15 shadow-sm p-6">
              <h3 className="flex items-center gap-2.5 mb-5 text-base font-bold text-[#0F172A]">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-[#2563EB]" />
                </div>
                AI Live Analysis
              </h3>

              {livePreview &&
              (livePreview.suggestedCategory ||
                livePreview.suggestedPriority) ? (
                <div className="space-y-3">
                  {livePreview.suggestedCategory && (
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="mb-2 text-xs font-semibold tracking-wider text-blue-800 uppercase">
                        Category
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getCategoryColor(livePreview.suggestedCategory)}`}
                        >
                          {livePreview.suggestedCategory}
                        </span>
                        <Tag className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                    </div>
                  )}
                  {livePreview.suggestedPriority && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="mb-2 text-xs font-semibold tracking-wider uppercase text-amber-800">
                        Priority
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getPriorityColor(livePreview.suggestedPriority)}`}
                        >
                          {livePreview.suggestedPriority}
                        </span>
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                    </div>
                  )}
                  {livePreview.sentiment && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="mb-2 text-xs font-semibold tracking-wider uppercase text-slate-600">
                        Sentiment
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {getSentimentIcon(livePreview.sentiment)}
                        </span>
                        <span className="text-sm text-[#374151] capitalize font-medium">
                          {livePreview.sentiment}
                        </span>
                      </div>
                    </div>
                  )}
                  {livePreview.detectedEntities.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="mb-2 text-xs font-semibold tracking-wider uppercase text-emerald-800">
                        Entities
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {livePreview.detectedEntities.map((entity, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white border rounded-lg text-emerald-700 border-emerald-200"
                          >
                            <MapPin className="w-3 h-3" />
                            {entity.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <div className="flex items-center justify-center mx-auto mb-4 w-14 h-14 rounded-2xl bg-slate-100">
                    <Eye className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Start typing to see
                    <br />
                    real-time AI analysis
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Duplicate Warning Modal ── */}
        {showDuplicateWarning && duplicates.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
                <h3 className="flex items-center gap-2.5 text-base font-bold text-[#0F172A]">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100">
                    <Copy className="w-4 h-4 text-amber-600" />
                  </div>
                  Possible Duplicate Found
                </h3>
                <button
                  onClick={() => setShowDuplicateWarning(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                <p className="mb-4 text-sm text-[#64748B]">
                  Your complaint appears similar to existing ones. Please review
                  before proceeding.
                </p>
                <div className="space-y-3">
                  {duplicates.map((dup) => (
                    <div
                      key={dup.complaintId}
                      className="p-4 border border-amber-200 rounded-xl bg-amber-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#0F172A] flex-1">
                          {dup.title}
                        </p>
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 whitespace-nowrap">
                          {Math.round(dup.similarity * 100)}% match
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                <button
                  onClick={() => setShowDuplicateWarning(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#64748B] border border-[#E2E8F0] rounded-xl hover:bg-white transition-colors"
                >
                  Review First
                </button>
                <button
                  onClick={() => setShowDuplicateWarning(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1E40AF] rounded-xl transition-all duration-150 shadow-sm hover:shadow-md"
                >
                  Submit Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Complaints Panel ── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0]">
            <h2 className="text-lg font-bold text-[#0F172A]">My Complaints</h2>
            <button
              onClick={() => setShowForm(true)}
              disabled={showForm}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1E40AF] text-white text-sm font-semibold rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> Submit New
            </button>
          </div>

          {/* Filter Bar */}
          <div className="px-6 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center gap-3">
            <Filter className="w-4 h-4 text-[#94A3B8]" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ComplaintStatus | "all")
              }
              className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#374151] font-medium focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            {statusFilter !== "all" && (
              <span className="ml-1 text-xs text-[#64748B]">
                {filteredComplaints.length} result
                {filteredComplaints.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Complaints List */}
          <div className="divide-y divide-[#F1F5F9]">
            {filteredComplaints.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100">
                  <FileText className="w-7 h-7 text-slate-300" />
                </div>
                <p className="font-semibold text-[#374151] mb-1">
                  No complaints found
                </p>
                <p className="text-sm text-[#94A3B8] mb-5">
                  {statusFilter !== "all"
                    ? "Try a different filter"
                    : "You haven't submitted any complaints yet"}
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1E40AF] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Submit your first complaint
                </button>
              </div>
            ) : (
              filteredComplaints.map((complaint) => (
                <div key={complaint.id}>
                  {/* Complaint Row */}
                  <div
                    className="px-6 py-5 cursor-pointer hover:bg-[#F8FAFC] transition-colors duration-150 group"
                    onClick={() => loadAiDetails(complaint.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#0F172A] mb-1 group-hover:text-[#2563EB] transition-colors">
                          {complaint.title}
                        </h3>
                        <p className="text-sm text-[#64748B] line-clamp-2 mb-3 leading-relaxed">
                          {complaint.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(
                              complaint.status,
                            )}`}
                          >
                            {complaint.status}
                          </span>

                          {complaint.priority && (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getPriorityColor(
                                complaint.priority,
                              )}`}
                            >
                              {complaint.priority}
                            </span>
                          )}

                          {complaint.category && (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getCategoryColor(
                                complaint.category,
                              )}`}
                            >
                              {complaint.category}
                            </span>
                          )}

                          <span className="text-xs text-[#94A3B8] ml-1">
                            {formatDate(complaint.created_at)}
                          </span>

                          {/* Pending-only Delete */}
                          {complaint.status === "Pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteComplaint(complaint.id);
                              }}
                              className="ml-2 inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 active:scale-[0.98]"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#2563EB]/10 flex items-center justify-center transition-colors mt-0.5">
                        {expandedComplaint === complaint.id ? (
                          <ChevronUp className="w-4 h-4 text-[#64748B] group-hover:text-[#2563EB]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#64748B] group-hover:text-[#2563EB]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded AI Details */}
                  {expandedComplaint === complaint.id && aiDetails && (
                    <div className="px-6 py-5 bg-[#F8FAFC] border-t border-[#E2E8F0]">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
                          <Brain className="w-3.5 h-3.5 text-[#2563EB]" />
                        </div>
                        <h4 className="text-sm font-bold text-[#0F172A]">
                          AI Analysis
                        </h4>
                        <span className="text-xs text-[#94A3B8] font-medium bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-full">
                          {aiDetails.confidence_score}% confidence
                        </span>
                      </div>

                      {/* Category Scores */}
                      <div className="grid grid-cols-2 gap-2.5 mb-4 md:grid-cols-4">
                        {Object.entries(aiDetails.category_scores ?? {}).map(
                          ([cat, score]) => (
                            <div
                              key={cat}
                              className={`rounded-xl p-3 border transition-all ${
                                cat === aiDetails.category_detected
                                  ? "bg-[#2563EB]/5 border-[#2563EB]/30 ring-1 ring-[#2563EB]/20"
                                  : "bg-white border-[#E2E8F0]"
                              }`}
                            >
                              <p
                                className={`text-xs mb-1 font-medium ${cat === aiDetails.category_detected ? "text-[#2563EB]" : "text-[#64748B]"}`}
                              >
                                {cat}
                              </p>
                              <p
                                className={`text-sm font-bold ${cat === aiDetails.category_detected ? "text-[#1E40AF]" : "text-[#0F172A]"}`}
                              >
                                {score}
                              </p>
                            </div>
                          ),
                        )}
                      </div>

                      {/* Sentiment + Entities */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <div className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 flex items-center gap-2">
                          <span className="text-sm">
                            {getSentimentIcon(
                              aiDetails.sentiment_tone ?? "neutral",
                            )}
                          </span>

                          <span className="text-xs font-semibold text-[#374151] capitalize">
                            {aiDetails.sentiment_tone ?? "Neutral"}
                          </span>

                          <span className="text-xs text-[#94A3B8]">
                            (
                            {aiDetails.sentiment_score !== null &&
                            aiDetails.sentiment_score !== undefined
                              ? `${Math.round(aiDetails.sentiment_score * 100)}%`
                              : "0%"}
                            )
                          </span>
                        </div>

                        {(aiDetails.entities ?? []).map((entity, i) => (
                          <div
                            key={i}
                            className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 flex items-center gap-1.5"
                          >
                            <MapPin className="w-3 h-3 text-emerald-500" />

                            <span className="text-xs font-medium text-[#374151]">
                              {entity.value}
                            </span>

                            <span className="text-xs text-[#94A3B8]">
                              ({entity.type})
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Suggestions */}
                      {(aiDetails.suggestions ?? []).length > 0 && (
                        <div>
                          <p className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-[#374151] uppercase tracking-wider">
                            <Shield className="w-3.5 h-3.5 text-[#2563EB]" />{" "}
                            Recommended Actions
                          </p>
                          <div className="space-y-2">
                            {aiDetails.suggestions.map((s, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl"
                              >
                                <span className="text-xs font-bold text-[#2563EB] bg-[#2563EB]/10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                <div>
                                  <p className="text-xs font-semibold text-[#0F172A] mb-0.5">
                                    {s.action}
                                  </p>
                                  <p className="text-xs text-[#64748B]">
                                    {s.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
