/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { api } from '@/lib/api'
import { parseTaskArtifactsResponse } from '@/features/usage-logs/lib/task-artifacts'
import type { TaskArtifactProjection } from '@/features/usage-logs/types'

import { API_ENDPOINTS } from './constants'
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelOption,
  GroupOption,
  TaskPluginOption,
  TaskSubmitRequest,
  TaskSubmitResponse,
  TaskItem,
} from './types'

/**
 * Send chat completion request (non-streaming)
 */
export async function sendChatCompletion(
  payload: ChatCompletionRequest,
  signal?: AbortSignal
): Promise<ChatCompletionResponse> {
  const res = await api.post(API_ENDPOINTS.CHAT_COMPLETIONS, payload, {
    signal,
    skipErrorHandler: true,
  } as Record<string, unknown>)
  return res.data
}

/**
 * Get user available models
 */
export async function getUserModels(group: string): Promise<ModelOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_MODELS, {
    params: { group },
  })
  const { data } = res

  if (!data.success || !Array.isArray(data.data)) {
    return []
  }

  return data.data.map((model: string) => ({
    label: model,
    value: model,
  }))
}

/**
 * Get user groups
 */
export async function getUserGroups(): Promise<GroupOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_GROUPS)
  const { data } = res

  if (!data.success || !data.data) {
    return []
  }

  const groupData = data.data as Record<string, { desc: string; ratio: number }>

  // label is for button display (name only); desc is for dropdown content
  return Object.entries(groupData).map(([group, info]) => ({
    label: group,
    value: group,
    ratio: info.ratio,
    desc: info.desc,
  }))
}

/**
 * Get task-plugin models available to the current user
 */
export async function getUserTaskModels(): Promise<TaskPluginOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_TASK_MODELS)
  const { data } = res

  if (!data.success || !Array.isArray(data.data)) {
    return []
  }

  return data.data.map((item: TaskPluginOption) => ({
    key: item.key,
    name: item.name,
    models: item.models,
  }))
}

/**
 * Upload image files for the playground gallery.
 */
export async function uploadFiles(files: File[]): Promise<string[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  const res = await api.post(API_ENDPOINTS.UPLOAD_FILES, formData, {
    skipErrorHandler: true,
  } as Record<string, unknown>)
  const { data } = res
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.message || 'Upload failed')
  }
  return data.data as string[]
}

/**
 * Submit a task through the playground
 */
export async function submitTask(
  pluginKey: string,
  payload: TaskSubmitRequest
): Promise<TaskSubmitResponse> {
  const res = await api.post(
    `${API_ENDPOINTS.TASK_SUBMIT}/${encodeURIComponent(pluginKey)}`,
    payload,
    { skipErrorHandler: true } as Record<string, unknown>
  )
  return res.data
}

/**
 * Query a single user task by id (used for polling)
 */
export async function getUserTaskById(taskId: string): Promise<TaskItem | null> {
  const res = await api.get(API_ENDPOINTS.USER_TASKS, {
    params: { task_id: taskId, page_size: 1 },
  })
  const { data } = res

  if (!data.success || !data.data?.items || data.data.items.length === 0) {
    return null
  }

  return data.data.items[0] as TaskItem
}

/**
 * Get artifacts for a task
 */
export async function getTaskArtifactsForPlayground(
  taskId: string
): Promise<TaskArtifactProjection> {
  const res = await api.get(`/api/task/${encodeURIComponent(taskId)}/artifacts`)
  return parseTaskArtifactsResponse(res.data)
}
