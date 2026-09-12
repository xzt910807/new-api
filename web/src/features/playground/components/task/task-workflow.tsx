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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  ComboboxInput,
  type ComboboxInputOption,
} from '@/components/ui/combobox-input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import {
  getUserModels,
  getUserTaskModels,
  sendChatCompletion,
  submitTask,
} from '../../api'
import { parseRequestErrorDetails } from '../../lib'
import type { GalleryItem, TaskPluginOption } from '../../types'

import { GalleryPanel } from './gallery-panel'
import { TaskResultPanel } from './task-result-panel'

interface TaskWorkflowProps {
  group: string
}

const GALLERY_STORAGE_KEY = 'playground_task_gallery'
const POLL_INTERVAL_MS = 3000

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

type WorkflowStep = 'prompt' | 'image' | 'video'

export function TaskWorkflow({ group }: TaskWorkflowProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<WorkflowStep>('prompt')
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [refinedPrompt, setRefinedPrompt] = useState('')
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedVideoModel, setSelectedVideoModel] = useState('')
  const [selectedImageGenModel, setSelectedImageGenModel] = useState('')
  const [size, setSize] = useState('')
  const [resolution, setResolution] = useState('')
  const [duration, setDuration] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [imageTaskId, setImageTaskId] = useState<string | null>(null)
  const [gallery, setGallery] = useState<GalleryItem[]>(loadGallery)
  const [plugins, setPlugins] = useState<TaskPluginOption[]>([])

  useEffect(() => {
    getUserTaskModels()
      .then((data) => setPlugins(data))
      .catch(() => setPlugins([]))
  }, [])

  const videoPlugins = useMemo(
    () => plugins.filter((p) => !isImagePlugin(p)),
    [plugins]
  )
  const imagePlugins = useMemo(
    () => plugins.filter((p) => isImagePlugin(p)),
    [plugins]
  )

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

  const handleRefinePrompt = async () => {
    if (!originalPrompt.trim()) {
      toast.error(t('Please enter a prompt'))
      return
    }
    if (!selectedModel) {
      const models = await getUserModels(group)
      if (models.length > 0 && !selectedModel) {
        setSelectedModel(models[0].value)
      }
      if (models.length === 0) {
        toast.error(t('No chat models available'))
        return
      }
    }

    setIsRefining(true)
    try {
      const response = await sendChatCompletion({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content:
              'You are a prompt engineer for AI video generation. Rewrite the user request into a concise, vivid English video prompt optimized for text-to-video or image-to-video models. Output only the prompt.',
          },
          { role: 'user', content: originalPrompt.trim() },
        ],
        stream: false,
      })
      const content = response.choices[0]?.message?.content ?? ''
      setRefinedPrompt(content.trim())
      setStep('image')
    } catch (err) {
      const { errorMessage } = parseRequestErrorDetails(err)
      toast.error(t('Failed to refine prompt'), { description: errorMessage })
    } finally {
      setIsRefining(false)
    }
  }

  const handleGenerateImage = async () => {
    const imagePlugin = imagePlugins.find((p) =>
      p.models.some((m) => m === selectedImageGenModel)
    )
    if (!imagePlugin) {
      toast.error(t('Please select an image model'))
      return
    }
    if (!refinedPrompt.trim()) {
      toast.error(t('Prompt is required'))
      return
    }

    setIsGeneratingImage(true)
    try {
      const response = await submitTask(imagePlugin.key, {
        model: selectedImageGenModel,
        prompt: refinedPrompt.trim(),
      })
      setImageTaskId(response.task_id)
    } catch (err) {
      const { errorMessage } = parseRequestErrorDetails(err)
      toast.error(t('Failed to submit image task'), {
        description: errorMessage,
      })
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleGenerateVideo = async () => {
    const videoPlugin = videoPlugins.find((p) =>
      p.models.some((m) => m === selectedVideoModel)
    )
    if (!videoPlugin) {
      toast.error(t('Please select a video model'))
      return
    }
    if (!refinedPrompt.trim()) {
      toast.error(t('Prompt is required'))
      return
    }

    const selectedImages = gallery.filter((item) =>
      selectedImageIds.includes(item.id)
    )
    const selectedUrls = selectedImages.map((item) =>
      getFullImageUrl(item.url)
    )

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
      model: selectedVideoModel,
      prompt: refinedPrompt.trim(),
    }

    if (selectedUrls.length > 0) {
      const firstUrl = selectedUrls[0]
      payload.image = firstUrl
      payload.images = selectedUrls
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

    const dims = resolveAgnesDimensions(resolution, size)
    if (dims) {
      payload.width = dims.width
      payload.height = dims.height
    }

    if (duration.trim()) {
      const seconds = Number(duration)
      if (!Number.isNaN(seconds) && seconds > 0) {
        const frames = resolveAgnesFrames(seconds)
        payload.duration = seconds
        payload.seconds = String(seconds)
        payload.num_frames = frames.numFrames
        payload.frame_rate = frames.frameRate
      }
    }

    setIsSubmitting(true)
    try {
      const response = await submitTask(videoPlugin.key, payload)
      setActiveTaskId(response.task_id)
      setStep('video')
      toast.success(t('Task submitted'))
    } catch (err) {
      const { errorMessage } = parseRequestErrorDetails(err)
      toast.error(t('Failed to submit task'), { description: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageTaskComplete = (urls: string[]) => {
    if (urls.length === 0) return
    handleAddToGallery(urls)
    const newIds = urls
      .map((_, index) => gallery[gallery.length - urls.length + index]?.id)
      .filter(Boolean) as string[]
    if (newIds.length > 0) {
      setSelectedImageIds((prev) =>
        [...prev, ...newIds].slice(0, 5)
      )
    }
    setImageTaskId(null)
  }

  const handleReset = () => {
    setStep('prompt')
    setOriginalPrompt('')
    setRefinedPrompt('')
    setSelectedImageIds([])
    setSelectedVideoModel('')
    setSelectedImageGenModel('')
    setSize('')
    setResolution('')
    setDuration('')
    setActiveTaskId(null)
    setImageTaskId(null)
  }

  return (
    <div className='mx-auto w-full max-w-6xl p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{t('Workflow')}</h2>
        <div className='flex gap-2'>
          {(['prompt', 'image', 'video'] as WorkflowStep[]).map((s, idx) => (
            <div
              key={s}
              className={`flex items-center gap-2 text-sm ${
                step === s
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              <span className='bg-muted flex size-6 items-center justify-center rounded-full text-xs'>
                {idx + 1}
              </span>
              <span>
                {s === 'prompt' && t('Generate prompt')}
                {s === 'image' && t('Prepare image')}
                {s === 'video' && t('Generate video')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='space-y-4'>
          {step === 'prompt' && (
            <>
              <div className='space-y-2'>
                <Label>{t('What video do you want to create?')}</Label>
                <Textarea
                  value={originalPrompt}
                  onChange={(e) => setOriginalPrompt(e.target.value)}
                  placeholder={t('Describe the video you want to generate')}
                  className='min-h-48'
                  rows={10}
                />
              </div>
              <div className='space-y-2'>
                <Label>{t('Refinement model')}</Label>
                <ModelSelect
                  group={group}
                  value={selectedModel}
                  onChange={setSelectedModel}
                />
              </div>
              <Button
                type='button'
                className='w-full'
                disabled={isRefining || !originalPrompt.trim()}
                onClick={handleRefinePrompt}
              >
                {isRefining ? t('Refining...') : t('Generate prompt')}
              </Button>
            </>
          )}

          {step === 'image' && (
            <>
              <div className='space-y-2'>
                <Label>{t('Refined prompt')}</Label>
                <Textarea
                  value={refinedPrompt}
                  onChange={(e) => setRefinedPrompt(e.target.value)}
                  rows={10}
                />
              </div>

              {imagePlugins.length > 0 && (
                <div className='space-y-2 rounded-lg border p-3'>
                  <Label>{t('Generate reference image')}</Label>
                  <Select
                    value={selectedImageGenModel}
                    onValueChange={(value) =>
                      setSelectedImageGenModel(value ?? '')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select an image model')} />
                    </SelectTrigger>
                    <SelectContent>
                      {imagePlugins.map((plugin) => (
                        <div key={plugin.key}>
                          <div className='text-muted-foreground px-2 py-1.5 text-xs font-medium'>
                            {plugin.name}
                          </div>
                          {plugin.models.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type='button'
                    variant='outline'
                    className='w-full'
                    disabled={isGeneratingImage || !selectedImageGenModel}
                    onClick={handleGenerateImage}
                  >
                    {isGeneratingImage
                      ? t('Generating...')
                      : t('Generate image')}
                  </Button>
                  {imageTaskId && (
                    <ImageTaskPoller
                      taskId={imageTaskId}
                      onComplete={handleImageTaskComplete}
                    />
                  )}
                </div>
              )}

              <GalleryPanel
                items={gallery}
                selectedIds={selectedImageIds}
                maxSelection={5}
                autoSelectOnUpload
                onChange={handleGalleryChange}
                onSelectionChange={(ids) => setSelectedImageIds(ids)}
              />

              <div className='grid grid-cols-3 gap-4'>
                <div className='space-y-2'>
                  <Label>{t('Aspect ratio (optional)')}</Label>
                  <Select
                    value={size}
                    onValueChange={(value) => setSize(value ?? '')}
                  >
                    <SelectTrigger className='w-full min-w-[120px]'>
                      <SelectValue placeholder={t('Select aspect ratio')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='16:9'>16:9</SelectItem>
                      <SelectItem value='9:16'>9:16</SelectItem>
                      <SelectItem value='1:1'>1:1</SelectItem>
                      <SelectItem value='4:3'>4:3</SelectItem>
                      <SelectItem value='3:4'>3:4</SelectItem>
                    </SelectContent>
                  </Select>
                  {size && (
                    <p className='text-muted-foreground whitespace-nowrap text-xs'>
                      {aspectRatioHint(size, t)}
                    </p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label>{t('Resolution (optional)')}</Label>
                  <Select
                    value={resolution}
                    onValueChange={(value) => setResolution(value ?? '')}
                  >
                    <SelectTrigger className='w-full min-w-[100px]'>
                      <SelectValue placeholder={t('Select resolution')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='480p'>480p</SelectItem>
                      <SelectItem value='720p'>720p</SelectItem>
                      <SelectItem value='1080p'>1080p</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>{t('Duration (optional)')}</Label>
                  <ComboboxInput
                    value={duration}
                    onValueChange={(value) => setDuration(value)}
                    options={durationOptions(t)}
                    placeholder={t('Select or type duration')}
                    emptyText={t('No preset duration')}
                    allowCustomValue
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label>{t('Video model')}</Label>
                <Select
                  value={selectedVideoModel}
                  onValueChange={(value) => setSelectedVideoModel(value ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select a video model')} />
                  </SelectTrigger>
                  <SelectContent>
                    {videoPlugins.map((plugin) => (
                      <div key={plugin.key}>
                        <div className='text-muted-foreground px-2 py-1.5 text-xs font-medium'>
                          {plugin.name}
                        </div>
                        {plugin.models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type='button'
                className='w-full'
                disabled={
                  isSubmitting || !refinedPrompt.trim() || !selectedVideoModel
                }
                onClick={handleGenerateVideo}
              >
                {isSubmitting ? t('Submitting...') : t('Generate video')}
              </Button>

              <p className='text-muted-foreground text-xs'>
                {selectedImageIds.length > 0
                  ? t('{{count}} image(s) selected: image-to-video mode', {
                      count: selectedImageIds.length,
                    })
                  : t('No image selected: text-to-video mode')}
              </p>
            </>
          )}

          {step === 'video' && activeTaskId && (
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={handleReset}
            >
              {t('Start new workflow')}
            </Button>
          )}
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
              {step === 'video'
                ? t('Waiting for task result...')
                : t('Complete the steps on the left to generate a video')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function durationOptions(
  t: (key: string, options?: Record<string, unknown>) => string
): ComboboxInputOption[] {
  return [3, 5, 10, 18].map((value) => ({
    value: String(value),
    label: t('About {{seconds}} seconds', { seconds: value }),
  }))
}

function aspectRatioHint(
  value: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const hints: Record<string, string> = {
    '16:9': t('Aspect ratio 16:9 hint'),
    '9:16': t('Aspect ratio 9:16 hint'),
    '1:1': t('Aspect ratio 1:1 hint'),
    '4:3': t('Aspect ratio 4:3 hint'),
    '3:4': t('Aspect ratio 3:4 hint'),
  }
  return hints[value] ?? ''
}

function isImagePlugin(plugin: TaskPluginOption): boolean {
  const key = plugin.key.toLowerCase()
  if (key.includes('image') || key.includes('img') || key.includes('picture')) {
    return true
  }
  return plugin.models.some((model) => {
    const m = model.toLowerCase()
    return (
      m.includes('image') || m.includes('img') || m.includes('picture')
    )
  })
}

function ImageTaskPoller({
  taskId,
  onComplete,
}: {
  taskId: string
  onComplete: (urls: string[]) => void
}) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<string>('PENDING')

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | null = null

    const poll = async () => {
      try {
        const response = await fetch(`/api/task/${encodeURIComponent(taskId)}/artifacts`)
        if (cancelled) return
        const result = await response.json()
        const taskStatus = result.data?.status ?? result.status ?? 'PENDING'
        setStatus(taskStatus)

        if (taskStatus.toUpperCase() === 'SUCCESS') {
          const artifacts = result.data?.artifacts ?? []
          const urls = artifacts
            .filter((a: { type?: string }) => a.type === 'image')
            .map((a: { content_url?: string }) => a.content_url)
            .filter(Boolean)
          onComplete(urls)
          return
        }

        if (taskStatus.toUpperCase() === 'FAILURE') {
          toast.error(t('Image generation failed'))
          return
        }

        timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS)
      } catch {
        if (cancelled) return
        timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [taskId, onComplete, t])

  return (
    <p className='text-muted-foreground text-xs'>
      {t('Image generation status', { status })}
    </p>
  )
}

function ModelSelect({
  group,
  value,
  onChange,
}: {
  group: string
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const [models, setModels] = useState<{ label: string; value: string }[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await getUserModels(group)
        if (cancelled) return
        setModels(data)
        if (data.length > 0 && !value) {
          onChange(data[0].value)
        }
      } catch {
        if (!cancelled) {
          setModels([])
        }
      } finally {
        if (!cancelled) {
          setLoaded(true)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [group, onChange, value])

  if (!loaded && models.length === 0) {
    return (
      <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder={t('Loading models...')} />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
      <SelectTrigger>
        <SelectValue placeholder={t('Select a model')} />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            {model.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
