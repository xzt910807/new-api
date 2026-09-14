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
import { useNavigate } from '@tanstack/react-router'

import { PlaygroundChat } from './components/chat/playground-chat'
import { PlaygroundInput } from './components/input/playground-input'
import { TaskPlayground } from './components/task'
import { TaskWorkflow } from './components/task/task-workflow'
import {
  useChatHandler,
  usePlaygroundConversation,
  usePlaygroundOptions,
  usePlaygroundState,
} from './hooks'

type PlaygroundMode = 'chat' | 'video'
type VideoSubMode = 'single' | 'workflow'

export interface PlaygroundPreset {
  model?: string
  prompt?: string
  mode?: 'video' | 'chat'
  size?: string
}

interface PlaygroundProps {
  preset?: PlaygroundPreset
}

export function Playground({ preset }: PlaygroundProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // Capture the first preset so a later URL cleanup (search reset) cannot
  // re-apply or clear the prefilled state.
  const [initialPreset] = useState<PlaygroundPreset | undefined>(preset)
  const [mode, setMode] = useState<PlaygroundMode>(
    initialPreset?.mode ?? 'video'
  )
  const [videoSubMode, setVideoSubMode] = useState<VideoSubMode>('single')
  const {
    config,
    parameterEnabled,
    messages,
    isLoadingMessages,
    models,
    groups,
    updateMessages,
    setModels,
    setGroups,
    updateConfig,
    updateParameterEnabled,
    clearMessages,
  } = usePlaygroundState()

  const { sendChat, stopGeneration, isGenerating } = useChatHandler({
    config,
    parameterEnabled,
    onMessageUpdate: updateMessages,
  })

  const {
    editingMessageKey,
    handleSendMessage,
    handleRegenerateMessage,
    handleEditMessage,
    handleEditOpenChange,
    applyEdit,
    handleDeleteMessage,
  } = usePlaygroundConversation({
    messages,
    updateMessages,
    sendChat,
  })

  const handleClearMessages = () => {
    handleEditOpenChange(false)
    clearMessages()
  }

  const { isLoadingModels } = usePlaygroundOptions({
    currentGroup: config.group,
    currentModel: config.model,
    setGroups,
    setModels,
    updateConfig,
  })

  useEffect(() => {
    if (initialPreset?.mode === 'chat' && initialPreset.model) {
      updateConfig('model', initialPreset.model)
    }
  }, [initialPreset, updateConfig])

  // Consume the deep-link params: drop them from the address bar so a
  // refresh does not overwrite edits the user has made since.
  useEffect(() => {
    if (!initialPreset) return
    const { model, prompt, mode: presetMode, size } = initialPreset
    if (!model && !prompt && !presetMode && !size) return
    navigate({ to: '/playground', search: {}, replace: true })
  }, [initialPreset, navigate])

  const videoPreset =
    initialPreset && initialPreset.mode !== 'chat' ? initialPreset : undefined
  const chatPresetPrompt =
    initialPreset?.mode === 'chat' ? initialPreset.prompt : undefined

  return (
    <div className='relative flex size-full min-h-0 flex-col overflow-hidden'>
      <div className='border-b bg-background/95 px-4 py-2 backdrop-blur'>
        <div className='mx-auto flex max-w-4xl gap-2'>
          <button
            type='button'
            onClick={() => setMode('video')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'video'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {t('Video')}
          </button>
          <button
            type='button'
            onClick={() => setMode('chat')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'chat'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {t('Chat')}
          </button>
        </div>
      </div>

      {mode === 'video' ? (
        <div className='flex min-h-0 flex-1 flex-col overflow-auto'>
          <div className='border-b bg-background/95 px-4 py-2 backdrop-blur'>
            <div className='mx-auto flex max-w-6xl items-center justify-between gap-4'>
              <div className='flex items-center gap-1 rounded-lg border p-1'>
                <button
                  type='button'
                  onClick={() => setVideoSubMode('single')}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    videoSubMode === 'single'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('Single video')}
                </button>
                <button
                  type='button'
                  onClick={() => setVideoSubMode('workflow')}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    videoSubMode === 'workflow'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('Workflow')}
                </button>
              </div>
            </div>
          </div>
          {videoSubMode === 'single' ? (
            <TaskPlayground
              initialModel={videoPreset?.model}
              initialPrompt={videoPreset?.prompt}
              initialSize={videoPreset?.size}
            />
          ) : (
            <TaskWorkflow group={config.group} />
          )}
        </div>
      ) : (
        <>
          {/* Full-width scroll container: scrolling works even over side whitespace */}
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            <PlaygroundChat
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              onRegenerateMessage={handleRegenerateMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onSelectPrompt={handleSendMessage}
              isGenerating={isGenerating}
              editingKey={editingMessageKey}
              onCancelEdit={handleEditOpenChange}
              onSaveEdit={(newContent) => applyEdit(newContent, false)}
              onSaveEditAndSubmit={(newContent) => applyEdit(newContent, true)}
            />
          </div>

          {/* Input area: center content and constrain to the same container width */}
          <div className='mx-auto w-full max-w-4xl'>
            <PlaygroundInput
              config={config}
              disabled={isGenerating}
              groups={groups}
              groupValue={config.group}
              initialText={chatPresetPrompt}
              isGenerating={isGenerating}
              isModelLoading={isLoadingModels}
              modelValue={config.model}
              models={models}
              onGroupChange={(value) => updateConfig('group', value)}
              onConfigChange={updateConfig}
              onClearMessages={handleClearMessages}
              onModelChange={(value) => updateConfig('model', value)}
              onParameterEnabledChange={updateParameterEnabled}
              onStop={stopGeneration}
              onSubmit={handleSendMessage}
              parameterEnabled={parameterEnabled}
              hasMessages={messages.length > 0}
            />
          </div>
        </>
      )}
    </div>
  )
}
