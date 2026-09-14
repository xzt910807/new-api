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
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  buildTemplatePlaygroundSearch,
  TEMPLATE_CATEGORY_LABEL_KEYS,
  TEMPLATE_PREVIEW_COUNT,
  TEMPLATE_PRESETS,
  type TemplatePreset,
} from '@/features/templates/data/presets'
import { useAuthStore } from '@/stores/auth-store'

interface TemplateStripProps {
  className?: string
  isAuthenticated?: boolean
}

export function TemplateStrip(props: TemplateStripProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const isAuthenticated = props.isAuthenticated ?? !!auth.user

  const presets = TEMPLATE_PRESETS.slice(0, TEMPLATE_PREVIEW_COUNT)

  const handleUseTemplate = (preset: TemplatePreset) => {
    if (!isAuthenticated) {
      navigate({ to: '/sign-up' })
      return
    }
    navigate({
      to: '/playground',
      search: buildTemplatePlaygroundSearch(preset),
    })
  }

  return (
    <section className='border-border/40 relative z-10 border-t px-6 py-20 md:py-24'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-10 flex flex-wrap items-end justify-between gap-4'>
          <div className='max-w-lg'>
            <p className='text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase'>
              {t('Templates')}
            </p>
            <h2 className='text-2xl leading-tight font-bold tracking-tight md:text-3xl'>
              {t('Start from a proven template')}
            </h2>
          </div>
          <Button
            variant='outline'
            className='border-border/50 hover:border-border hover:bg-muted/50 rounded-lg'
            render={<Link to='/templates' />}
          >
            {t('View all')}
            <ArrowRight className='ml-1 size-3.5' />
          </Button>
        </AnimateInView>

        <div className='-mx-6 overflow-x-auto px-6 pb-2'>
          <div className='flex snap-x gap-4'>
            {presets.map((preset, i) => (
              <div
                key={preset.id}
                className='w-60 shrink-0 snap-start md:w-64'
              >
                <AnimateInView delay={Math.min(i, 3) * 80} animation='fade-up'>
                  <button
                    type='button'
                    onClick={() => handleUseTemplate(preset)}
                    className='border-border/40 bg-background hover:border-border group block w-full overflow-hidden rounded-xl border text-left transition-colors duration-300'
                  >
                    <div
                      className='relative aspect-[4/3]'
                      style={{
                        background: `linear-gradient(135deg, ${preset.cover.from}, ${preset.cover.to})`,
                      }}
                    >
                      <Badge
                        variant='secondary'
                        className='bg-background/80 absolute top-3 left-3 backdrop-blur'
                      >
                        {t(TEMPLATE_CATEGORY_LABEL_KEYS[preset.category])}
                      </Badge>
                      <span className='bg-background/90 text-foreground absolute right-3 bottom-3 left-3 translate-y-1 rounded-md px-2.5 py-1.5 text-center text-xs font-medium opacity-0 backdrop-blur transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100'>
                        {t('Use template')}
                      </span>
                    </div>
                    <div className='p-4'>
                      <h3 className='text-sm font-semibold'>
                        {t(preset.title)}
                      </h3>
                      <p className='text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed'>
                        {t(preset.description)}
                      </p>
                    </div>
                  </button>
                </AnimateInView>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
