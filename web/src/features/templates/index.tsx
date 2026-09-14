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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { PublicLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/auth-store'

import {
  buildTemplatePlaygroundSearch,
  TEMPLATE_CATEGORY_IDS,
  TEMPLATE_CATEGORY_LABEL_KEYS,
  TEMPLATE_PRESETS,
  type TemplateCategory,
  type TemplatePreset,
} from './data/presets'

const ALL_CATEGORY = 'all'

type ActiveCategory = TemplateCategory | typeof ALL_CATEGORY

export function TemplatesGallery() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const isAuthenticated = !!auth.user
  const [activeCategory, setActiveCategory] =
    useState<ActiveCategory>(ALL_CATEGORY)

  const filteredPresets =
    activeCategory === ALL_CATEGORY
      ? TEMPLATE_PRESETS
      : TEMPLATE_PRESETS.filter(
          (preset) => preset.category === activeCategory
        )

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
    <PublicLayout>
      <div className='mx-auto max-w-6xl px-4 py-10 md:py-14'>
      <div className='mb-8 max-w-2xl'>
        <p className='text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase'>
          {t('Templates')}
        </p>
        <h1 className='text-3xl font-bold tracking-tight md:text-4xl'>
          {t('Template Gallery')}
        </h1>
        <p className='text-muted-foreground/80 mt-3 text-sm leading-relaxed md:text-base'>
          {t('Pick a template to jump-start your next image or video.')}
        </p>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={(value) =>
          setActiveCategory(value as ActiveCategory)
        }
        className='mb-8'
      >
        <TabsList>
          <TabsTrigger value={ALL_CATEGORY}>{t('All')}</TabsTrigger>
          {TEMPLATE_CATEGORY_IDS.map((category) => (
            <TabsTrigger key={category} value={category}>
              {t(TEMPLATE_CATEGORY_LABEL_KEYS[category])}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
        {filteredPresets.map((preset, i) => (
          <AnimateInView
            key={preset.id}
            delay={Math.min(i, 5) * 60}
            animation='fade-up'
          >
            <Card className='group overflow-hidden py-0'>
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
              </div>
              <CardHeader className='px-4 pt-4 pb-2'>
                <CardTitle className='text-sm'>{t(preset.title)}</CardTitle>
                <CardDescription className='line-clamp-2 text-xs leading-relaxed'>
                  {t(preset.description)}
                </CardDescription>
              </CardHeader>
              <CardFooter className='px-4 pt-0 pb-4'>
                <Button
                  size='sm'
                  className='w-full'
                  onClick={() => handleUseTemplate(preset)}
                >
                  {t('Use template')}
                </Button>
              </CardFooter>
            </Card>
          </AnimateInView>
        ))}
      </div>
      </div>
    </PublicLayout>
  )
}
