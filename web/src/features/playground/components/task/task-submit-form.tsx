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
import { useTranslation } from 'react-i18next'

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

import type { GalleryItem, TaskMode, TaskPluginOption } from '../../types'

import { GalleryPanel } from './gallery-panel'

export interface TaskFormData {
  model: string
  prompt: string
  image: string
  mode: TaskMode
  selectedImageIds: string[]
  size: string
  resolution: string
  duration: string
}

interface TaskSubmitFormProps {
  plugins: TaskPluginOption[]
  gallery: GalleryItem[]
  formData: TaskFormData
  isSubmitting: boolean
  onFormChange: (data: Partial<TaskFormData>) => void
  onGalleryChange: (items: GalleryItem[]) => void
  onSubmit: () => void
}

export function TaskSubmitForm({
  plugins,
  gallery,
  formData,
  isSubmitting,
  onFormChange,
  onGalleryChange,
  onSubmit,
}: TaskSubmitFormProps) {
  const { t } = useTranslation()

  const selectedPlugin = plugins.find((p) =>
    p.models.some((m) => m === formData.model)
  )

  const isImageMode = formData.mode === 'image-to-video'

  const handleModeChange = (mode: TaskMode) => {
    onFormChange({ mode, selectedImageIds: [] })
  }

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='task-model'>{t('Model')}</Label>
        <Select
          value={formData.model}
          onValueChange={(value) => onFormChange({ model: value ?? '' })}
        >
          <SelectTrigger id='task-model'>
            <SelectValue placeholder={t('Select a task model')} />
          </SelectTrigger>
          <SelectContent>
            {plugins.map((plugin) => (
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

      <div className='flex gap-2'>
        <Button
          type='button'
          variant={formData.mode === 'text-to-video' ? 'default' : 'outline'}
          className='flex-1'
          onClick={() => handleModeChange('text-to-video')}
        >
          {t('Text to video')}
        </Button>
        <Button
          type='button'
          variant={formData.mode === 'image-to-video' ? 'default' : 'outline'}
          className='flex-1'
          onClick={() => handleModeChange('image-to-video')}
        >
          {t('Image to video')}
        </Button>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='task-prompt'>{t('Prompt')}</Label>
        <Textarea
          id='task-prompt'
          value={formData.prompt}
          onChange={(e) => onFormChange({ prompt: e.target.value })}
          placeholder={t('Describe what you want to generate')}
          className='min-h-48'
          rows={10}
        />
      </div>

      {isImageMode && (
        <GalleryPanel
          items={gallery}
          selectedIds={formData.selectedImageIds}
          maxSelection={5}
          autoSelectOnUpload
          onChange={onGalleryChange}
          onSelectionChange={(ids) => onFormChange({ selectedImageIds: ids })}
        />
      )}

      <div className='grid grid-cols-3 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='task-size'>{t('Aspect ratio (optional)')}</Label>
          <Select
            value={formData.size}
            onValueChange={(value) => onFormChange({ size: value ?? '' })}
          >
            <SelectTrigger id='task-size' className='w-full min-w-[120px]'>
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
          {formData.size && (
            <p className='text-muted-foreground whitespace-nowrap text-xs'>
              {aspectRatioHint(formData.size, t)}
            </p>
          )}
        </div>
        <div className='space-y-2'>
          <Label htmlFor='task-resolution'>{t('Resolution (optional)')}</Label>
          <Select
            value={formData.resolution}
            onValueChange={(value) =>
              onFormChange({ resolution: value ?? '' })
            }
          >
            <SelectTrigger id='task-resolution' className='w-full min-w-[100px]'>
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
          <Label htmlFor='task-duration'>{t('Duration (optional)')}</Label>
          <ComboboxInput
            id='task-duration'
            value={formData.duration}
            onValueChange={(value) => onFormChange({ duration: value })}
            options={durationOptions(t)}
            placeholder={t('Select or type duration')}
            emptyText={t('No preset duration')}
            allowCustomValue
          />
        </div>
      </div>

      <Button
        type='button'
        className='w-full'
        disabled={isSubmitting || !formData.model}
        onClick={onSubmit}
      >
        {isSubmitting ? t('Submitting...') : t('Generate')}
      </Button>

      {selectedPlugin && (
        <p className='text-muted-foreground text-xs'>
          {t('Plugin')}: {selectedPlugin.name} ({selectedPlugin.key})
        </p>
      )}
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
