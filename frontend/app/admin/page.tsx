'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import {
  fetchAdminActionLogs,
  fetchAdminEvents,
  fetchAdminIdentity,
  fetchAdminLandmarks,
  logAdminAction,
  makeContentId,
  upsertAdminEvent,
  upsertAdminLandmark
} from '../../lib/adminData';
import type { AdminActionLog, Landmark, LandmarkType, LocalEvent } from '../../types';

type AdminTab = 'events' | 'landmarks' | 'logs';
type EventType = LocalEvent['type'];

const EVENT_TYPES: EventType[] = ['festival', 'market', 'concert', 'sports', 'other'];
const LANDMARK_TYPES: LandmarkType[] = ['museum', 'park', 'architecture', 'entertainment', 'historic', 'food', 'sports'];

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>('events');
  const [actorId, setActorId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [logs, setLogs] = useState<AdminActionLog[]>([]);

  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    type: 'other' as EventType,
    startTime: '',
    lat: 41.882,
    lng: -87.629,
    isPublished: false
  });

  const [newLandmark, setNewLandmark] = useState({
    name: '',
    description: '',
    type: 'historic' as LandmarkType,
    lat: 41.882,
    lng: -87.629,
    isPublished: true
  });

  const hasData = useMemo(() => events.length + landmarks.length > 0, [events.length, landmarks.length]);

  const loadAdminData = async (uid: string) => {
    const [identity, eventData, landmarkData, logData] = await Promise.all([
      fetchAdminIdentity(uid),
      fetchAdminEvents(),
      fetchAdminLandmarks(),
      fetchAdminActionLogs(30)
    ]);

    if (!identity?.isAdmin) {
      setIsAdmin(false);
      setActorId(identity?.id || null);
      setEvents([]);
      setLandmarks([]);
      setLogs([]);
      return;
    }

    setActorId(identity.id);
    setIsAdmin(true);
    setEvents(eventData);
    setLandmarks(landmarkData);
    setLogs(logData);
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) {
          setIsAdmin(false);
          return;
        }
        await loadAdminData(uid);
      } catch (err: any) {
        setError(err?.message || 'Unable to load admin data.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const refresh = async () => {
    if (!actorId) return;
    await loadAdminData(actorId);
  };

  const handleCreateEvent = async () => {
    if (!actorId) return;
    if (!newEvent.name.trim()) {
      setError('Event name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const event: LocalEvent = {
      id: makeContentId(newEvent.name),
      name: newEvent.name.trim(),
      description: newEvent.description.trim(),
      type: newEvent.type,
      startTime: toIsoDateTime(newEvent.startTime),
      lat: Number(newEvent.lat),
      lng: Number(newEvent.lng),
      isPublished: newEvent.isPublished,
      isDeleted: false
    };
    try {
      await upsertAdminEvent(event);
      await logAdminAction({
        actorId,
        action: 'create',
        resourceType: 'event',
        resourceId: event.id,
        payload: { name: event.name, isPublished: event.isPublished }
      });
      setNewEvent({
        name: '',
        description: '',
        type: 'other',
        startTime: '',
        lat: 41.882,
        lng: -87.629,
        isPublished: false
      });
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to create event.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEvent = async (event: LocalEvent) => {
    if (!actorId) return;
    setSaving(true);
    setError(null);
    try {
      await upsertAdminEvent({
        ...event,
        name: event.name.trim(),
        description: event.description.trim(),
        startTime: toIsoDateTime(event.startTime)
      });
      await logAdminAction({
        actorId,
        action: 'update',
        resourceType: 'event',
        resourceId: event.id,
        payload: { isPublished: event.isPublished, isDeleted: event.isDeleted }
      });
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to update event.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLandmark = async () => {
    if (!actorId) return;
    if (!newLandmark.name.trim()) {
      setError('Landmark name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const landmark: Landmark = {
      id: makeContentId(newLandmark.name),
      name: newLandmark.name.trim(),
      description: newLandmark.description.trim(),
      type: newLandmark.type,
      lat: Number(newLandmark.lat),
      lng: Number(newLandmark.lng),
      isPublished: newLandmark.isPublished,
      isDeleted: false
    };
    try {
      await upsertAdminLandmark(landmark);
      await logAdminAction({
        actorId,
        action: 'create',
        resourceType: 'landmark',
        resourceId: landmark.id,
        payload: { name: landmark.name, isPublished: landmark.isPublished }
      });
      setNewLandmark({
        name: '',
        description: '',
        type: 'historic',
        lat: 41.882,
        lng: -87.629,
        isPublished: true
      });
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to create landmark.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLandmark = async (landmark: Landmark) => {
    if (!actorId) return;
    setSaving(true);
    setError(null);
    try {
      await upsertAdminLandmark({
        ...landmark,
        name: landmark.name.trim(),
        description: landmark.description.trim()
      });
      await logAdminAction({
        actorId,
        action: 'update',
        resourceType: 'landmark',
        resourceId: landmark.id,
        payload: { isPublished: landmark.isPublished, isDeleted: landmark.isDeleted }
      });
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to update landmark.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        Loading admin backoffice...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="text-zinc-400 text-sm">
            This route is restricted to admin users. Ask an existing admin to set your user profile&apos;s
            <span className="text-zinc-200"> isAdmin </span> flag.
          </p>
          <Link href="/" className="inline-block px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500">
            Back to App
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Aura Admin Backoffice</h1>
            <p className="text-zinc-400 text-sm">Curate events and landmarks, then publish/unpublish for users.</p>
          </div>
          <Link href="/" className="px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500">
            Back to App
          </Link>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-100 text-sm">{error}</div>
        )}

        <div className="flex gap-2">
          {(['events', 'landmarks', 'logs'] as AdminTab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-4 py-2 rounded-lg border text-sm uppercase tracking-wider ${
                tab === item
                  ? 'bg-gold text-black border-gold'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {!hasData && (
          <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 text-sm">
            No curated records yet. Create your first event or landmark.
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3 p-4 border border-zinc-800 rounded-xl bg-zinc-900">
              <input
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                placeholder="Event name"
                value={newEvent.name}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, name: e.target.value }))}
              />
              <select
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                value={newEvent.type}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, type: e.target.value as EventType }))}
              >
                {EVENT_TYPES.map((eventType) => (
                  <option key={eventType} value={eventType}>{eventType}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, startTime: e.target.value }))}
              />
              <input
                type="number"
                step="0.000001"
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                value={newEvent.lat}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, lat: Number(e.target.value) }))}
              />
              <input
                type="number"
                step="0.000001"
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                value={newEvent.lng}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, lng: Number(e.target.value) }))}
              />
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={newEvent.isPublished}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, isPublished: e.target.checked }))}
                />
                Published
              </label>
              <textarea
                className="md:col-span-3 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-h-20"
                placeholder="Event description"
                value={newEvent.description}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
              />
              <button
                onClick={handleCreateEvent}
                disabled={saving}
                className="md:col-span-3 px-4 py-2 rounded-lg bg-gold text-black font-semibold disabled:opacity-60"
              >
                Create Event
              </button>
            </div>

            {events.map((event) => (
              <div key={event.id} className="p-4 border border-zinc-800 rounded-xl bg-zinc-900 grid md:grid-cols-3 gap-3">
                <input
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  value={event.name}
                  onChange={(e) =>
                    setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, name: e.target.value } : row)))
                  }
                />
                <select
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  value={event.type}
                  onChange={(e) =>
                    setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, type: e.target.value as EventType } : row)))
                  }
                >
                  {EVENT_TYPES.map((eventType) => (
                    <option key={eventType} value={eventType}>{eventType}</option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  value={toDateTimeLocal(event.startTime)}
                  onChange={(e) =>
                    setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, startTime: toIsoDateTime(e.target.value) } : row)))
                  }
                />
                <input
                  type="number"
                  step="0.000001"
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  value={event.lat}
                  onChange={(e) =>
                    setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, lat: Number(e.target.value) } : row)))
                  }
                />
                <input
                  type="number"
                  step="0.000001"
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  value={event.lng}
                  onChange={(e) =>
                    setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, lng: Number(e.target.value) } : row)))
                  }
                />
                <div className="flex items-center gap-4 text-xs uppercase tracking-wide">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(event.isPublished)}
                      onChange={(e) =>
                        setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, isPublished: e.target.checked } : row)))
                      }
                    />
                    Published
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(event.isDeleted)}
                      onChange={(e) =>
                        setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, isDeleted: e.target.checked } : row)))
                      }
                    />
                    Soft Deleted
                  </label>
                </div>
                <textarea
                  className="md:col-span-3 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-h-20"
                  value={event.description}
                  onChange={(e) =>
                    setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, description: e.target.value } : row)))
                  }
                />
                <div className="md:col-span-3 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-mono">{event.id}</span>
                  <button
                    onClick={() => handleSaveEvent(event)}
                    disabled={saving}
                    className="px-3 py-2 rounded-lg border border-zinc-600 hover:border-zinc-400 text-sm"
                  >
                    Save Event
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'landmarks' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3 p-4 border border-zinc-800 rounded-xl bg-zinc-900">
              <input
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                placeholder="Landmark name"
                value={newLandmark.name}
                onChange={(e) => setNewLandmark((prev) => ({ ...prev, name: e.target.value }))}
              />
              <select
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                value={newLandmark.type}
                onChange={(e) => setNewLandmark((prev) => ({ ...prev, type: e.target.value as LandmarkType }))}
              >
                {LANDMARK_TYPES.map((landmarkType) => (
                  <option key={landmarkType} value={landmarkType}>{landmarkType}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={newLandmark.isPublished}
                  onChange={(e) => setNewLandmark((prev) => ({ ...prev, isPublished: e.target.checked }))}
                />
                Published
              </label>
              <input
                type="number"
                step="0.000001"
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                value={newLandmark.lat}
                onChange={(e) => setNewLandmark((prev) => ({ ...prev, lat: Number(e.target.value) }))}
              />
              <input
                type="number"
                step="0.000001"
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                value={newLandmark.lng}
                onChange={(e) => setNewLandmark((prev) => ({ ...prev, lng: Number(e.target.value) }))}
              />
              <div />
              <textarea
                className="md:col-span-3 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-h-20"
                placeholder="Landmark description"
                value={newLandmark.description}
                onChange={(e) => setNewLandmark((prev) => ({ ...prev, description: e.target.value }))}
              />
              <button
                onClick={handleCreateLandmark}
                disabled={saving}
                className="md:col-span-3 px-4 py-2 rounded-lg bg-gold text-black font-semibold disabled:opacity-60"
              >
                Create Landmark
              </button>
            </div>

            {landmarks.map((landmark) => (
              <div key={landmark.id} className="p-4 border border-zinc-800 rounded-xl bg-zinc-900 grid md:grid-cols-3 gap-3">
                <input
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  value={landmark.name}
                  onChange={(e) =>
                    setLandmarks((prev) => prev.map((row) => (row.id === landmark.id ? { ...row, name: e.target.value } : row)))
                  }
                />
                <select
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  value={landmark.type}
                  onChange={(e) =>
                    setLandmarks((prev) => prev.map((row) => (row.id === landmark.id ? { ...row, type: e.target.value as LandmarkType } : row)))
                  }
                >
                  {LANDMARK_TYPES.map((landmarkType) => (
                    <option key={landmarkType} value={landmarkType}>{landmarkType}</option>
                  ))}
                </select>
                <div className="flex items-center gap-4 text-xs uppercase tracking-wide">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(landmark.isPublished)}
                      onChange={(e) =>
                        setLandmarks((prev) => prev.map((row) => (row.id === landmark.id ? { ...row, isPublished: e.target.checked } : row)))
                      }
                    />
                    Published
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(landmark.isDeleted)}
                      onChange={(e) =>
                        setLandmarks((prev) => prev.map((row) => (row.id === landmark.id ? { ...row, isDeleted: e.target.checked } : row)))
                      }
                    />
                    Soft Deleted
                  </label>
                </div>
                <input
                  type="number"
                  step="0.000001"
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  value={landmark.lat}
                  onChange={(e) =>
                    setLandmarks((prev) => prev.map((row) => (row.id === landmark.id ? { ...row, lat: Number(e.target.value) } : row)))
                  }
                />
                <input
                  type="number"
                  step="0.000001"
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  value={landmark.lng}
                  onChange={(e) =>
                    setLandmarks((prev) => prev.map((row) => (row.id === landmark.id ? { ...row, lng: Number(e.target.value) } : row)))
                  }
                />
                <div />
                <textarea
                  className="md:col-span-3 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-h-20"
                  value={landmark.description}
                  onChange={(e) =>
                    setLandmarks((prev) => prev.map((row) => (row.id === landmark.id ? { ...row, description: e.target.value } : row)))
                  }
                />
                <div className="md:col-span-3 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-mono">{landmark.id}</span>
                  <button
                    onClick={() => handleSaveLandmark(landmark)}
                    disabled={saving}
                    className="px-3 py-2 rounded-lg border border-zinc-600 hover:border-zinc-400 text-sm"
                  >
                    Save Landmark
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'logs' && (
          <div className="space-y-2">
            {logs.length === 0 && (
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm">
                No admin actions recorded yet.
              </div>
            )}
            {logs.map((log) => (
              <div key={log.id} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">
                    {log.action} {log.resourceType}
                    {log.resourceId ? ` (${log.resourceId})` : ''}
                  </div>
                  <div className="text-zinc-500 text-xs">{new Date(log.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-zinc-400 text-xs mt-1 font-mono">actor: {log.actorId}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
