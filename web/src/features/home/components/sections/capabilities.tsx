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
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Clapperboard,
  Image,
  ImagePlay,
  Layers,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

type CapabilityLink =
  | {
      to: '/playground'
      search: { mode: 'video' } | { mode: 'chat'; model: string }
    }
  | { to: '/canvas-sso' }

interface Capability {
  id: string
  title: string
  desc: string
  icon: ReactNode
  tone: string
  link: CapabilityLink
}

interface CapabilitiesProps {
  className?: string
}

export function Capabilities(_props: CapabilitiesProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const capabilities: Capability[] = [
    {
      id: 'text-to-video',
      title: t('Text to Video'),
      desc: t('Turn a written prompt into a cinematic video clip.'),
      icon: <Clapperboard className='size-5' strokeWidth={1.75} />,
      tone: 'text-blue-500 border-blue-500/20 bg-blue-500/5',
      link: { to: '/playground', search: { mode: 'video' } },
    },
    {
      id: 'image-to-video',
      title: t('Image to Video'),
      desc: t('Animate a still image into a living scene.'),
      icon: <ImagePlay className='size-5' strokeWidth={1.75} />,
      tone: 'text-violet-500 border-violet-500/20 bg-violet-500/5',
      link: { to: '/playground', search: { mode: 'video' } },
    },
    {
      id: 'text-to-image',
      title: t('Text to Image'),
      desc: t('Generate high-quality images from a single sentence.'),
      icon: <Image className='size-5' strokeWidth={1.75} />,
      tone: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5',
      link: {
        to: '/playground',
        search: { mode: 'chat', model: 'agnes-image-2.1-flash' },
      },
    },
    {
      id: 'infinite-canvas',
      title: t('Infinite Canvas'),
      desc: t('Compose, extend and refine visuals on an endless canvas.'),
      icon: <Layers className='size-5' strokeWidth={1.75} />,
      tone: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
      link: { to: '/canvas-sso' },
    },
  ]

  const handleOpen = (capability: Capability) => {
    const { link } = capability
    if (link.to === '/playground') {
      navigate({ to: '/playground', search: link.search })
    } else {
      navigate({ to: link.to })
    }
  }

  return (
    <section className='relative z-10 px-6 py-20 md:py-24'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-12 max-w-lg'>
          <p className='text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase'>
            {t('Capabilities')}
          </p>
          <h2 className='text-2xl leading-tight font-bold tracking-tight md:text-3xl'>
            {t('One platform, four ways to create')}
          </h2>
        </AnimateInView>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {capabilities.map((capability, i) => (
            <AnimateInView
              key={capability.id}
              delay={i * 100}
              animation='fade-up'
            >
              <button
                type='button'
                onClick={() => handleOpen(capability)}
                className='border-border/40 bg-background hover:border-border hover:bg-muted/20 group flex h-full w-full flex-col rounded-xl border p-7 text-left transition-colors duration-300'
              >
                <div
                  className={`mb-4 flex size-11 items-center justify-center rounded-lg border ${capability.tone}`}
                >
                  {capability.icon}
                </div>
                <h3 className='mb-1.5 text-base font-semibold'>
                  {capability.title}
                </h3>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  {capability.desc}
                </p>
                <span className='text-muted-foreground/60 group-hover:text-foreground mt-5 inline-flex items-center gap-1 text-xs font-medium transition-colors'>
                  {t('Try now')}
                  <ArrowRight className='size-3.5 transition-transform duration-200 group-hover:translate-x-0.5' />
                </span>
              </button>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
