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
import { Copy, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { uploadFiles } from '../../api'
import { parseRequestErrorDetails } from '../../lib'
import type { GalleryItem } from '../../types'

interface GalleryPanelProps {
  items: GalleryItem[]
  selectedIds?: string[]
  maxSelection?: number
  autoSelectOnUpload?: boolean
  onChange: (items: GalleryItem[]) => void
  onSelectionChange?: (ids: string[]) => void
}

export function GalleryPanel({
  items,
  selectedIds = [],
  maxSelection,
  autoSelectOnUpload,
  onChange,
  onSelectionChange,
}: GalleryPanelProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const processFiles = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      toast.error(t('Please drop image files only'))
      return
    }

    setIsUploading(true)
    try {
      const urls = await uploadFiles(imageFiles)
      const newItems: GalleryItem[] = urls.map((url) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        url,
        source: 'upload',
      }))
      onChange([...items, ...newItems])
      if (autoSelectOnUpload && onSelectionChange) {
        const newIds = newItems.map((item) => item.id)
        if (maxSelection === 1) {
          onSelectionChange([newIds[0]])
        } else {
          onSelectionChange(
            [...selectedIds, ...newIds].slice(0, maxSelection)
          )
        }
      }
      toast.success(t('Uploaded {{count}} image(s)', { count: newItems.length }))
    } catch (err) {
      const { errorMessage } = parseRequestErrorDetails(err)
      toast.error(t('Upload failed'), { description: errorMessage })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    await processFiles([...files])
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
    if (onSelectionChange) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id))
    }
  }

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('Copied'))
    } catch {
      toast.error(t('Copy failed'))
    }
  }

  const handleToggleSelect = (id: string) => {
    if (!onSelectionChange) return
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id))
      return
    }
    if (maxSelection && selectedIds.length >= maxSelection) {
      toast.warning(t('You can select up to {{count}} images', { count: maxSelection }))
      return
    }
    onSelectionChange([...selectedIds, id])
  }

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (isExternalFileDrag(e) || dragIndex === null || dragIndex === index) return
    const next = [...items]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(index, 0, moved)
    setDragIndex(index)
    onChange(next)
  }

  const handleContainerDragOver = (e: React.DragEvent) => {
    if (isExternalFileDrag(e)) {
      e.preventDefault()
      setIsDraggingOver(true)
    }
  }

  const handleContainerDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false)
    }
  }

  const handleContainerDrop = async (e: React.DragEvent) => {
    if (!isExternalFileDrag(e)) return
    e.preventDefault()
    setIsDraggingOver(false)
    const files = [...e.dataTransfer.files]
    if (files.length > 0) {
      await processFiles(files)
    }
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>{t('Gallery')}</span>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className='mr-1 size-4' />
          {isUploading ? t('Uploading...') : t('Upload images')}
        </Button>
        <input
          ref={inputRef}
          type='file'
          accept='image/*'
          multiple
          className='hidden'
          onChange={handleFileChange}
        />
      </div>

      {items.length === 0 ? (
        <div
          className={cn(
            'border-border bg-muted/30 hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 transition-colors',
            isDraggingOver && 'bg-primary/10 border-primary'
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleContainerDragOver}
          onDragLeave={handleContainerDragLeave}
          onDrop={handleContainerDrop}
        >
          <Upload className={cn('mb-2 size-8', isDraggingOver ? 'text-primary' : 'text-muted-foreground')} />
          <p className='text-muted-foreground text-sm text-center'>
            {isDraggingOver
              ? t('Drop images here')
              : t('Drag and drop images here or click to upload')}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            'grid grid-cols-3 gap-2 rounded-lg border p-2 transition-colors',
            isDraggingOver && 'bg-primary/10 border-primary border-dashed'
          )}
          onDragOver={handleContainerDragOver}
          onDragLeave={handleContainerDragLeave}
          onDrop={handleContainerDrop}
        >
          {items.map((item, index) => {
            const isSelected = selectedIds.includes(item.id)
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => setDragIndex(null)}
                className={cn(
                  'group relative aspect-square cursor-grab overflow-hidden rounded-lg border',
                  isSelected && 'ring-primary ring-2'
                )}
                onClick={() => handleToggleSelect(item.id)}
              >
                <img
                  src={item.url}
                  alt=''
                  className='size-full object-cover'
                />
                <div className='absolute inset-0 hidden items-center justify-center gap-1 bg-black/50 group-hover:flex'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='text-white hover:bg-white/20'
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleCopy(item.url)
                    }}
                  >
                    <Copy className='size-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='text-white hover:bg-white/20'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(item.id)
                    }}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
                {isSelected && (
                  <div className='bg-primary absolute right-1 top-1 flex size-5 items-center justify-center rounded-full text-[10px] text-white'>
                    <X className='size-3' />
                  </div>
                )}
              </div>
            )
          })}
          <button
            type='button'
            onClick={() => inputRef.current?.click()}
            className='border-border bg-muted/30 hover:bg-muted/50 flex aspect-square items-center justify-center rounded-lg border border-dashed'
          >
            <Upload className='text-muted-foreground size-6' />
          </button>
        </div>
      )}
    </div>
  )
}

function isExternalFileDrag(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes('Files')
}
