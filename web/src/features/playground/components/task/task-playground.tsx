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
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import { getUserTaskModels, submitTask } from '../../api'
import type { GalleryItem } from '../../types'

import {
  TaskSubmitForm,
  type TaskFormData,
} from './task-submit-form'
import { TaskResultPanel } from './task-result-panel'

const DEFAULT_FORM_DATA: TaskFormData = {
  model: '',
  prompt: '',
  image: '',
  mode: 'text-to-video',
  selectedImageIds: [],
  size: '',
  resolution: '',
  duration: '',
}

const GALLERY_STORAGE_KEY = 'playground_task_gallery'

function loadGallery(): GalleryItem[] {
  try {
    const raw = localStorage.getItem(GALLERY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GalleryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveGallery(items: GalleryItem[]) {
  try {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore storage errors
  }
}

export function TaskPlayground() {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<TaskFormData>(DEFAULT_FORM_DATA)
  const [gallery, setGallery] = useState<GalleryItem[]>(loadGallery)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const {
    data: plugins = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['playground-task-models'],
    queryFn: getUserTaskModels,
  })

  useEffect(() => {
    if (formData.model || plugins.length === 0) return

    const allModels = plugins.flatMap((plugin) => plugin.models)
    const defaultModel =
      allModels.find((model) => model === 'agnes-video-v2.0') ??
      allModels[0]
    if (defaultModel) {
      setFormData((prev) => ({ ...prev, model: defaultModel }))
    }
  }, [plugins, formData.model])

  const selectedPlugin = useMemo(() => {
    return plugins.find((plugin) =>
      plugin.models.some((model) => model === formData.model)
    )
  }, [plugins, formData.model])

  const handleFormChange = (data: Partial<TaskFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const handleGalleryChange = (items: GalleryItem[]) => {
    setGallery(items)
    saveGallery(items)
  }

  const handleAddToGallery = (urls: string[]) => {
    const newItems: GalleryItem[] = urls.map((url) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      url,
      source: 'generated',
    }))
    const next = [...gallery, ...newItems]
    setGallery(next)
    saveGallery(next)
  }

  const handleSubmit = async () => {
    if (!selectedPlugin) {
      toast.error(t('Please select a model'))
      return
    }

    const isImageMode = formData.mode === 'image-to-video'
    if (isImageMode) {
      const selectedCount = gallery.filter((item) =>
        formData.selectedImageIds.includes(item.id)
      ).length
      if (selectedCount === 0) {
        toast.error(t('Please select at least one image'))
        return
      }
    } else if (!formData.prompt.trim()) {
      toast.error(t('Please enter a prompt'))
      return
    }

    const prompt = formData.prompt.trim()

    const payload: {
      model: string
      prompt: string
      image?: string
      images?: string[]
      image_url?: string
      first_frame_image_url?: string
      mode?: string
      extra_body?: {
        mode?: string
        image?: string[]
      }
      width?: number
      height?: number
      duration?: number
      seconds?: string
      num_frames?: number
      frame_rate?: number
    } = {
      model: formData.model,
      prompt: isImageMode && !prompt ? t('Generate video from selected images') : prompt,
    }

    if (isImageMode) {
      const selectedUrls = gallery
        .filter((item) => formData.selectedImageIds.includes(item.id))
        .map((item) => getFullImageUrl(item.url))
      if (selectedUrls.length > 0) {
        const firstUrl = selectedUrls[0]
        payload.images = selectedUrls
        payload.image = firstUrl
        payload.image_url = firstUrl
        payload.first_frame_image_url = firstUrl
        if (selectedUrls.length === 1) {
          payload.mode = 'ti2vid'
        } else {
          payload.mode = 'keyframes'
          payload.extra_body = {
            mode: 'keyframes',
            image: selectedUrls,
          }
        }
      }
    } else if (formData.image.trim()) {
      payload.image = getFullImageUrl(formData.image.trim())
    }

    const dims = resolveAgnesDimensions(formData.resolution, formData.size)
    if (dims) {
      payload.width = dims.width
      payload.height = dims.height
    }

    if (formData.duration.trim()) {
      const duration = Number(formData.duration)
      if (!Number.isNaN(duration) && duration > 0) {
        const frames = resolveAgnesFrames(duration)
        payload.duration = duration
        payload.seconds = String(duration)
        payload.num_frames = frames.numFrames
        payload.frame_rate = frames.frameRate
      }
    }

    setIsSubmitting(true)
    try {
      const response = await submitTask(selectedPlugin.key, payload)
      setActiveTaskId(response.task_id)
      toast.success(t('Task submitted'))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(t('Failed to submit task'), { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setActiveTaskId(null)
    setFormData(DEFAULT_FORM_DATA)
  }

  if (isLoading) {
    return (
      <div className='text-muted-foreground p-8 text-center'>
        {t('Loading task models...')}
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant='destructive' className='m-4'>
        <AlertTitle>{t('Failed to load task models')}</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : String(error)}
        </AlertDescription>
      </Alert>
    )
  }

  if (plugins.length === 0) {
    return (
      <div className='text-muted-foreground p-8 text-center'>
        {t('No task models available')}
      </div>
    )
  }

  return (
    <div className='mx-auto w-full max-w-6xl p-4'>
      <div className='grid gap-6 lg:grid-cols-2'>
        <div>
          <TaskSubmitForm
            plugins={plugins}
            gallery={gallery}
            formData={formData}
            isSubmitting={isSubmitting}
            onFormChange={handleFormChange}
            onGalleryChange={handleGalleryChange}
            onSubmit={handleSubmit}
          />
        </div>
        <div>
          {activeTaskId ? (
            <TaskResultPanel
              taskId={activeTaskId}
              gallery={gallery}
              onAddToGallery={handleAddToGallery}
              onReset={handleReset}
            />
          ) : (
            <div className='text-muted-foreground bg-muted/40 flex h-full min-h-80 items-center justify-center rounded-lg text-sm'>
              {t('Submit a task to see results here')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getFullImageUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (typeof window === 'undefined') return url
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
}

function resolveAgnesDimensions(
  resolution: string,
  aspectRatio: string,
): { width: number; height: number } | null {
  const heights: Record<string, number> = {
    '480p': 480,
    '720p': 720,
    '1080p': 1080,
  }
  const shortEdge = heights[resolution]
  if (!shortEdge || !aspectRatio) return null

  const ratios: Record<string, { w: number; h: number }> = {
    '16:9': { w: 16, h: 9 },
    '9:16': { w: 9, h: 16 },
    '1:1': { w: 1, h: 1 },
    '4:3': { w: 4, h: 3 },
    '3:4': { w: 3, h: 4 },
  }
  const ratio = ratios[aspectRatio]
  if (!ratio) return null

  if (aspectRatio === '16:9' || aspectRatio === '4:3') {
    return {
      width: Math.round((shortEdge * ratio.w) / ratio.h),
      height: shortEdge,
    }
  }
  if (aspectRatio === '9:16' || aspectRatio === '3:4') {
    return {
      width: shortEdge,
      height: Math.round((shortEdge * ratio.h) / ratio.w),
    }
  }
  return { width: shortEdge, height: shortEdge }
}

function resolveAgnesFrames(durationSeconds: number): { numFrames: number; frameRate: number } {
  switch (durationSeconds) {
    case 3:
      return { numFrames: 81, frameRate: 24 }
    case 5:
      return { numFrames: 121, frameRate: 24 }
    case 10:
      return { numFrames: 241, frameRate: 24 }
    case 18:
      return { numFrames: 441, frameRate: 24 }
    default:
      return { numFrames: Math.round(durationSeconds * 24), frameRate: 24 }
  }
}
