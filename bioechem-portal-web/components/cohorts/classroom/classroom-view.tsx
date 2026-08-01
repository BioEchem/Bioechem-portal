"use client";

import { useState } from "react";
import {
  Video, Play, Calendar, Clock, Plus, ExternalLink,
  Pencil, Trash2, Radio, CheckCircle, Loader2,
  // Link2, // TODO: re-enable with Google Meet auto-creation
} from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";
import { formatShortDate as fmtDate } from "@/lib/format/date";

export type ClassSession = {
  id: string;
  cohort_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: "scheduled" | "live" | "ended";
  created_at: string;
};

export type SessionRecording = {
  id: string;
  cohort_id: string;
  session_id: string | null;
  title: string;
  description: string | null;
  video_url: string | null;
  file_path: string | null;
  thumbnail_url: string | null;
  published: boolean;
  created_at: string;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function youtubeEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return null;
}

// ── Session form ──────────────────────────────────────────────────────────
function SessionForm({
  cohortId,
  initial,
  onSave,
  onCancel,
}: {
  cohortId: string;
  initial?: Partial<ClassSession>;
  onSave: (data: Partial<ClassSession>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [meetingUrl, setMeetingUrl] = useState(initial?.meeting_url ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduled_at
      ? new Date(initial.scheduled_at).toISOString().slice(0, 16)
      : ""
  );
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 60);
  const [saving, setSaving] = useState(false);
  // const [creatingMeet, setCreatingMeet] = useState(false); // TODO: Google Meet auto-creation
  const [error, setError] = useState<string | null>(null);

  const inputCls = "w-full rounded-lg border border-card-border px-3 py-2 text-sm focus:border-bio-green focus:outline-none";

  // TODO: Google Meet auto-creation — uncomment when Google OAuth verification is approved
  // async function createGoogleMeet() {
  //   setCreatingMeet(true); setError(null);
  //   try {
  //     const res = await fetch(`/api/cohorts/${cohortId}/sessions/create-meet`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         title: title || "Class Session",
  //         scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
  //         duration_minutes: duration,
  //       }),
  //     });
  //     const json = await res.json() as { meetUrl?: string; needsAuth?: boolean; authUrl?: string; error?: string };
  //
  //     if (json.needsAuth && json.authUrl) {
  //       const popup = window.open(json.authUrl, "google-auth", "width=500,height=600,left=200,top=100");
  //       await new Promise<void>((resolve) => {
  //         const handler = (e: MessageEvent) => {
  //           if ((e.data as { type?: string })?.type === "google-auth-success") {
  //             window.removeEventListener("message", handler);
  //             popup?.close();
  //             resolve();
  //           }
  //         };
  //         window.addEventListener("message", handler);
  //         const timer = setInterval(() => {
  //           if (popup?.closed) { clearInterval(timer); resolve(); }
  //         }, 500);
  //       });
  //       void createGoogleMeet();
  //       return;
  //     }
  //
  //     if (json.meetUrl) {
  //       setMeetingUrl(json.meetUrl);
  //     } else {
  //       setError(json.error ?? "Failed to create Meet link");
  //     }
  //   } catch {
  //     setError("Failed to create Meet link");
  //   } finally {
  //     setCreatingMeet(false);
  //   }
  // }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await onSave({ title, description: desc || null, scheduled_at: new Date(scheduledAt).toISOString(), duration_minutes: duration, meeting_url: meetingUrl || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Title *</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Meeting Link (Google Meet, Zoom, etc.)</label>
        <input
          type="url"
          className={inputCls}
          placeholder="https://meet.google.com/..."
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
        />
        {/* TODO: Google Meet auto-creation button — uncomment when OAuth verification approved
        <button type="button" onClick={() => void createGoogleMeet()} disabled={creatingMeet} ...>
          Create Google Meet
        </button> */}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Date & Time *</label>
          <input type="datetime-local" className={inputCls} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Duration (minutes)</label>
          <input type="number" min={15} max={480} className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Description</label>
        <textarea rows={2} className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial?.id ? "Save changes" : "Schedule class"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-bio-text-muted hover:text-bio-green">Cancel</button>
      </div>
    </form>
  );
}

// ── Recording form ────────────────────────────────────────────────────────
function RecordingForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<SessionRecording>;
  onSave: (data: Partial<SessionRecording>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls = "w-full rounded-lg border border-card-border px-3 py-2 text-sm focus:border-bio-green focus:outline-none";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await onSave({ title, description: desc || null, video_url: videoUrl || null, published });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Title *</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Video URL (YouTube, Vimeo, or direct link)</label>
        <input type="url" className={inputCls} placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Description</label>
        <textarea rows={2} className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Publish (visible to participants)
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial?.id ? "Save changes" : "Post recording"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-bio-text-muted hover:text-bio-green">Cancel</button>
      </div>
    </form>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────
export function ClassroomView({
  cohortId,
  initialSessions,
  initialRecordings,
  canManage,
}: {
  cohortId: string;
  initialSessions: ClassSession[];
  initialRecordings: SessionRecording[];
  canManage: boolean;
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [recordings, setRecordings] = useState(initialRecordings);
  const [creatingSession, setCreatingSession] = useState(false);
  const [creatingRecording, setCreatingRecording] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null);

  // Sessions
  async function handleCreateSession(data: Partial<ClassSession>) {
    const res = await fetch(`/api/cohorts/${cohortId}/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    setSessions((s) => [...s, json.data as ClassSession].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
    setCreatingSession(false);
  }

  async function handleUpdateSession(id: string, data: Partial<ClassSession>) {
    const res = await fetch(`/api/cohorts/${cohortId}/sessions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to update");
    setSessions((s) => s.map((x) => x.id === id ? json.data as ClassSession : x));
    setEditingSessionId(null);
  }

  async function handleDeleteSession(id: string) {
    if (!confirm("Delete this session?")) return;
    await fetch(`/api/cohorts/${cohortId}/sessions/${id}`, { method: "DELETE" });
    setSessions((s) => s.filter((x) => x.id !== id));
  }

  async function setSessionStatus(id: string, status: ClassSession["status"]) {
    const res = await fetch(`/api/cohorts/${cohortId}/sessions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (res.ok) setSessions((s) => s.map((x) => x.id === id ? json.data as ClassSession : x));
  }

  // Recordings
  async function handleCreateRecording(data: Partial<SessionRecording>) {
    const res = await fetch(`/api/cohorts/${cohortId}/recordings`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    setRecordings((r) => [json.data as SessionRecording, ...r]);
    setCreatingRecording(false);
  }

  async function handleUpdateRecording(id: string, data: Partial<SessionRecording>) {
    const res = await fetch(`/api/cohorts/${cohortId}/recordings/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to update");
    setRecordings((r) => r.map((x) => x.id === id ? json.data as SessionRecording : x));
    setEditingRecordingId(null);
  }

  async function handleDeleteRecording(id: string) {
    if (!confirm("Delete this recording?")) return;
    await fetch(`/api/cohorts/${cohortId}/recordings/${id}`, { method: "DELETE" });
    setRecordings((r) => r.filter((x) => x.id !== id));
  }

  const upcoming = sessions.filter((s) => s.status !== "ended");
  const past = sessions.filter((s) => s.status === "ended");

  return (
    <>
      <div className="space-y-6">
        {/* ── Live Sessions ── */}
        <PortalCard>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-bio-green" />
              <h2 className="font-semibold text-bio-text">Live Sessions</h2>
            </div>
            {canManage && !creatingSession && (
              <button
                onClick={() => setCreatingSession(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-bio-green px-3 py-1.5 text-sm font-medium text-white hover:bg-bio-green/90"
              >
                <Plus className="h-4 w-4" /> Schedule class
              </button>
            )}
          </div>

          {creatingSession && (
            <div className="mb-4 rounded-lg border border-card-border p-4">
              <p className="mb-3 text-sm font-semibold text-bio-green">New session</p>
              <SessionForm cohortId={cohortId} onSave={handleCreateSession} onCancel={() => setCreatingSession(false)} />
            </div>
          )}

          {upcoming.length === 0 && !creatingSession ? (
            <p className="text-sm text-bio-text-muted">No upcoming sessions scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((s) => (
                <div key={s.id}>
                  {editingSessionId === s.id && canManage ? (
                    <div className="rounded-lg border border-card-border p-4">
                      <SessionForm
                        cohortId={cohortId}
                        initial={s}
                        onSave={(data) => handleUpdateSession(s.id, data)}
                        onCancel={() => setEditingSessionId(null)}
                      />
                    </div>
                  ) : (
                    <div className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4 ${
                      s.status === "live" ? "border-green-300 bg-green-50" : "border-card-border bg-white"
                    }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.status === "live" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
                              <Radio className="h-3 w-3" /> LIVE
                            </span>
                          )}
                          <span className="font-medium text-bio-text">{s.title}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-bio-text-muted">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmt(s.scheduled_at)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration_minutes} min</span>
                        </div>
                        {s.description && <p className="mt-1 text-sm text-bio-text-muted">{s.description}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 flex-wrap">
                        {s.status !== "ended" && s.meeting_url && (
                          <a
                            href={s.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white ${
                              s.status === "live" ? "bg-green-600 hover:bg-green-700" : "bg-bio-green hover:bg-bio-green/90"
                            }`}
                          >
                            <Video className="h-4 w-4" />
                            {s.status === "live" ? "Join now" : "Join"}
                          </a>
                        )}
                        {canManage && (
                          <>
                            {s.status === "scheduled" && (
                              <button onClick={() => void setSessionStatus(s.id, "live")} className="text-xs text-green-600 hover:underline">Go live</button>
                            )}
                            {s.status === "live" && (
                              <button onClick={() => void setSessionStatus(s.id, "ended")} className="text-xs text-bio-text-muted hover:underline">End session</button>
                            )}
                            <button onClick={() => setEditingSessionId(s.id)} className="text-bio-text-muted hover:text-bio-green">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => void handleDeleteSession(s.id)} className="text-bio-text-muted hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div className="mt-4 border-t border-card-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bio-text-muted">Past sessions</p>
              <div className="space-y-2">
                {past.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-card-border px-4 py-2.5 text-sm text-bio-text-muted">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-bio-green/50" />
                      {s.title}
                      <span className="text-xs">{fmtDate(s.scheduled_at)}</span>
                    </span>
                    {canManage && (
                      <button onClick={() => void handleDeleteSession(s.id)} className="text-bio-text-muted hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </PortalCard>

        {/* ── Recordings ── */}
        <PortalCard>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-bio-green" />
              <h2 className="font-semibold text-bio-text">Recordings</h2>
            </div>
            {canManage && !creatingRecording && (
              <button
                onClick={() => setCreatingRecording(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-bio-green px-3 py-1.5 text-sm font-medium text-white hover:bg-bio-green/90"
              >
                <Plus className="h-4 w-4" /> Post recording
              </button>
            )}
          </div>

          {creatingRecording && (
            <div className="mb-4 rounded-lg border border-card-border p-4">
              <p className="mb-3 text-sm font-semibold text-bio-green">New recording</p>
              <RecordingForm onSave={handleCreateRecording} onCancel={() => setCreatingRecording(false)} />
            </div>
          )}

          {recordings.length === 0 && !creatingRecording ? (
            <p className="text-sm text-bio-text-muted">No recordings posted yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recordings.map((r) => {
                const embedUrl = r.video_url ? youtubeEmbedUrl(r.video_url) : null;
                return (
                  <div key={r.id} className="overflow-hidden rounded-xl border border-card-border">
                    {editingRecordingId === r.id && canManage ? (
                      <div className="p-4">
                        <RecordingForm
                          initial={r}
                          onSave={(data) => handleUpdateRecording(r.id, data)}
                          onCancel={() => setEditingRecordingId(null)}
                        />
                      </div>
                    ) : (
                      <>
                        {embedUrl ? (
                          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                            <iframe
                              src={embedUrl}
                              className="absolute inset-0 h-full w-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={r.title}
                            />
                          </div>
                        ) : r.video_url ? (
                          <video controls className="w-full bg-black" style={{ maxHeight: "240px" }}>
                            <source src={r.video_url} />
                          </video>
                        ) : (
                          <div className="flex h-32 items-center justify-center bg-gray-100">
                            <Play className="h-10 w-10 text-gray-300" />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-bio-text leading-snug">{r.title}</p>
                              {r.description && <p className="mt-1 text-sm text-bio-text-muted">{r.description}</p>}
                              <p className="mt-1 text-xs text-bio-text-muted">{fmtDate(r.created_at)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {r.video_url && !embedUrl && (
                                <a href={r.video_url} target="_blank" rel="noopener noreferrer" className="text-bio-text-muted hover:text-bio-green">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              {canManage && (
                                <>
                                  {!r.published && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Draft</span>
                                  )}
                                  <button onClick={() => setEditingRecordingId(r.id)} className="text-bio-text-muted hover:text-bio-green">
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => void handleDeleteRecording(r.id)} className="text-bio-text-muted hover:text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </PortalCard>
      </div>
    </>
  );
}

