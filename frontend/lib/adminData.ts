import { supabase } from './supabase';
import type { AdminActionLog, Landmark, LocalEvent } from '../types';

export interface AdminIdentity {
  id: string;
  name: string;
  isAdmin: boolean;
}

export async function fetchAdminIdentity(uid: string): Promise<AdminIdentity | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id,name,isAdmin')
    .eq('id', uid)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name || 'Explorer',
    isAdmin: Boolean(data.isAdmin)
  };
}

export async function fetchAdminLandmarks(): Promise<Landmark[]> {
  const { data, error } = await supabase
    .from('landmarks')
    .select('*')
    .order('updatedAt', { ascending: false });

  if (error || !data) throw error ?? new Error('Unable to fetch landmarks.');
  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    lat: item.lat,
    lng: item.lng,
    description: item.description || '',
    type: item.type || 'historic',
    isPublished: item.isPublished ?? true,
    isDeleted: item.isDeleted ?? false,
    updatedAt: item.updatedAt || null
  }));
}

export async function fetchAdminEvents(): Promise<LocalEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('startTime', { ascending: true });

  if (error || !data) throw error ?? new Error('Unable to fetch events.');
  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    lat: item.lat,
    lng: item.lng,
    description: item.description || '',
    type: item.type || 'other',
    startTime: item.startTime,
    isPublished: item.isPublished ?? false,
    isDeleted: item.isDeleted ?? false,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null
  }));
}

export async function upsertAdminLandmark(payload: Landmark): Promise<void> {
  const { error } = await supabase.from('landmarks').upsert({
    id: payload.id,
    name: payload.name,
    lat: payload.lat,
    lng: payload.lng,
    description: payload.description || '',
    type: payload.type,
    isPublished: payload.isPublished ?? true,
    isDeleted: payload.isDeleted ?? false,
    updatedAt: new Date().toISOString()
  });

  if (error) throw error;
}

export async function upsertAdminEvent(payload: LocalEvent): Promise<void> {
  const { error } = await supabase.from('events').upsert({
    id: payload.id,
    name: payload.name,
    lat: payload.lat,
    lng: payload.lng,
    description: payload.description || '',
    type: payload.type,
    startTime: payload.startTime,
    isPublished: payload.isPublished ?? false,
    isDeleted: payload.isDeleted ?? false,
    updatedAt: new Date().toISOString()
  });

  if (error) throw error;
}

export async function fetchAdminActionLogs(limit = 20): Promise<AdminActionLog[]> {
  const { data, error } = await supabase
    .from('admin_action_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) throw error ?? new Error('Unable to fetch action logs.');
  return data.map((item: any) => ({
    id: item.id,
    actorId: item.actor_id,
    action: item.action,
    resourceType: item.resource_type,
    resourceId: item.resource_id,
    payload: item.payload || {},
    createdAt: item.created_at
  }));
}

export async function logAdminAction(input: {
  actorId: string;
  action: string;
  resourceType: 'event' | 'landmark';
  resourceId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('admin_action_logs').insert({
    actor_id: input.actorId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId || null,
    payload: input.payload || {}
  });
  if (error) throw error;
}

export function makeContentId(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'item'}-${suffix}`;
}
