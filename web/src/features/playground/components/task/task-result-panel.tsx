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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

import type { TaskArtifact } from '@/features/usage-logs/types'

import { getTaskArtifactsForPlayground, getUserTaskById } from '../../api'
import type { GalleryItem, TaskItem } from '../../types'

const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILURE'])
const POLL_INTERVAL_MS = 3000

interface TaskResultPanelProps {
  taskId: string
  gallery: GalleryItem[]
  onAddToGallery: (urls: string[]) => void
  onReset: () => void
}

export function TaskResultPanel({
  taskId,
  gallery,
  onAddToGallery,
  onReset,
}: TaskResultPanelProps) {
  const { t } = useTranslation()
  const [task, setTask] = useState<TaskItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [artifacts, setArtifacts] = useState<TaskArtifact[] | null>(null)
  const [artifactsLoading, setArtifactsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | null = null

    const poll = async () => {
      try {
        const current = await getUserTaskById(taskId)
        if (cancelled) return
        setTask(current)
        setError(null)

        if (current && TERMINAL_STATUSES.has(current.status.toUpperCase())) {
          if (current.status.toUpperCase() === 'SUCCESS') {
            setArtifactsLoading(true)
            try {
              const response = await getTaskArtifactsForPlayground(taskId)
              if (!cancelled) {
                setArtifacts(response.artifacts ?? [])
              }
            } catch (err) {
              if (!cancelled) {
                setError(err instanceof Error ? err.message : String(err))
              }
            } finally {
              if (!cancelled) {
                setArtifactsLoading(false)
              }
            }
          }
          return
        }

        timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [taskId])

  const statusText = task?.status ?? 'PENDING'
  const isRunning = !task || !TERMINAL_STATUSES.has(task.status.toUpperCase())

  const handleAddToGallery = (url: string) => {
    const exists = gallery.some((item) => item.url === url)
    if (exists) {
      toast.warning(t('This image is already in the gallery'))
      return
    }
    onAddToGallery([url])
    toast.success(t('Added to gallery'))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          {isRunning && <Spinner className='size-4' />}
          <span>{t('Task')}</span>
          <span className='text-muted-foreground font-mono text-xs'>
            {taskId}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <span className='text-muted-foreground'>{t('Status')}: </span>
            <span className='font-medium'>{statusText}</span>
          </div>
          {task?.progress && (
            <div>
              <span className='text-muted-foreground'>{t('Progress')}: </span>
              <span className='font-medium'>{task.progress}</span>
            </div>
          )}
        </div>

        {error && (
          <Alert variant='destructive'>
            <AlertTitle>{t('Polling failed')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {task?.fail_reason && (
          <Alert variant='destructive'>
            <AlertTitle>{t('Task failed')}</AlertTitle>
            <AlertDescription>{task.fail_reason}</AlertDescription>
          </Alert>
        )}

        {task?.status.toUpperCase() === 'SUCCESS' && (
          <div className='space-y-2'>
            <h4 className='text-sm font-medium'>{t('Artifacts')}</h4>
            {artifactsLoading && (
              <div className='flex h-32 items-center justify-center'>
                <Spinner className='size-6' />
              </div>
            )}
            {!artifactsLoading && artifacts && artifacts.length > 0 && (
              <div
                className={cn(
                  'grid gap-3',
                  artifacts.length > 1 && 'lg:grid-cols-2'
                )}
              >
                {artifacts.map((artifact) => (
                  <ArtifactCard
                    key={artifact.key}
                    artifact={artifact}
                    onAddToGallery={handleAddToGallery}
                  />
                ))}
              </div>
            )}
            {!artifactsLoading && (!artifacts || artifacts.length === 0) && (
              <p className='text-muted-foreground text-sm'>{t('No artifacts')}</p>
            )}
          </div>
        )}

        {!isRunning && (
          <button
            type='button'
            className='text-primary text-sm hover:underline'
            onClick={onReset}
          >
            {t('Create another')}
          </button>
        )}
      </CardContent>
    </Card>
  )
}

function ArtifactCard({
  artifact,
  onAddToGallery,
}: {
  artifact: TaskArtifact
  onAddToGallery: (url: string) => void
}) {
  const { t } = useTranslation()
  const isImage = artifact.type === 'image'
  const isVideo = artifact.type === 'video'

  return (
    <div className='bg-muted/40 overflow-hidden rounded-lg border'>
      <div className='flex items-center justify-center bg-black/5'>
        {isImage && (
          <img
            src={artifact.content_url}
            alt={artifact.key}
            className='aspect-video w-full object-contain'
          />
        )}
        {isVideo && (
          <video
            src={artifact.content_url}
            controls
            preload='metadata'
            className='aspect-video w-full bg-black'
          />
        )}
        {!isImage && !isVideo && (
          <div className='flex aspect-video items-center justify-center'>
            <span className='text-muted-foreground text-sm'>
              {artifact.key}
            </span>
          </div>
        )}
      </div>
      <div className='flex items-center justify-between p-2'>
        <span className='text-muted-foreground truncate text-xs'>
          {artifact.key}
        </span>
        <div className='flex items-center gap-1'>
          {isImage && (
            <Button
              type='button'
              variant='ghost'
              size='xs'
              onClick={() => onAddToGallery(artifact.content_url)}
            >
              {t('Add to gallery')}
            </Button>
          )}
          <Button
            type='button'
            variant='ghost'
            size='xs'
            render={
              <a
                href={artifact.content_url}
                download={artifact.key}
                target='_blank'
                rel='noopener noreferrer'
              />
            }
          >
            {t('Download')}
          </Button>
        </div>
      </div>
    </div>
  )
}
