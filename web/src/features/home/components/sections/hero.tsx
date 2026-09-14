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
import { ArrowRight, WandSparkles } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const isAuthenticated = !!props.isAuthenticated

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = prompt.trim()

    if (!isAuthenticated) {
      navigate({ to: '/sign-up' })
      return
    }

    navigate({
      to: '/playground',
      search: value ? { prompt: value } : {},
    })
  }

  return (
    <section className='relative z-10 overflow-hidden px-6 pt-24 pb-16 md:pt-32 md:pb-20 lg:pt-36'>
      {/* Radial gradient background */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-25 dark:opacity-[0.12]'
        style={{
          background: [
            'radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.18 250 / 80%) 0%, transparent 70%)',
            'radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.65 0.15 200 / 60%) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 35% at 50% 85%, oklch(0.70 0.12 280 / 40%) 0%, transparent 70%)',
          ].join(', '),
        }}
      />
      {/* Grid pattern */}
      <div
        aria-hidden
        className='absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black_20%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.08]'
      />

      <div className='mx-auto max-w-3xl text-center'>
        {/* Top Pill Badge */}
        <div
          className='landing-animate-fade-up mb-5 inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-[11px] font-medium text-blue-600 opacity-0 shadow-xs dark:border-blue-400/20 dark:bg-blue-400/5 dark:text-blue-400'
          style={{ animationDelay: '0ms' }}
        >
          <span className='relative flex size-1.5'>
            <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75' />
            <span className='relative inline-flex size-1.5 rounded-full bg-blue-500 dark:bg-blue-400' />
          </span>
          <span>{t('AI Image & Video Studio')}</span>
        </div>

        <h1
          className='landing-animate-fade-up text-[clamp(2.25rem,4.5vw,3.25rem)] leading-[1.15] font-bold tracking-tight opacity-0'
          style={{ animationDelay: '60ms' }}
        >
          {t('Turn your ideas into')}
          <br />
          <span className='bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent'>
            {t('stunning visuals')}
          </span>
        </h1>
        <p
          className='landing-animate-fade-up text-muted-foreground/80 mx-auto mt-5 max-w-xl text-base leading-relaxed opacity-0 md:text-[15px]'
          style={{ animationDelay: '120ms' }}
        >
          {t(
            'Describe your idea, pick a template, and generate production-ready images and videos in minutes — no editing skills required.'
          )}
        </p>

        {/* Prompt input */}
        <form
          onSubmit={handleSubmit}
          className='landing-animate-fade-up mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border bg-background/95 p-2 opacity-0 shadow-[0_18px_60px_-32px_rgba(0,0,0,0.65)] ring-1 ring-foreground/5 backdrop-blur transition-all duration-200 focus-within:border-primary/45 focus-within:ring-primary/15 dark:bg-background/80'
          style={{ animationDelay: '180ms' }}
        >
          <Input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={t('Describe the image or video you want to create...')}
            className='border-none bg-transparent shadow-none focus-visible:ring-0'
            aria-label={t('Prompt')}
          />
          <Button type='submit' className='h-10 shrink-0 rounded-xl px-4'>
            <WandSparkles className='size-4' />
            <span className='hidden sm:inline'>{t('Create')}</span>
          </Button>
        </form>

        <div
          className='landing-animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3 opacity-0'
          style={{ animationDelay: '240ms' }}
        >
          {isAuthenticated ? (
            <>
              <Button
                className='group h-11 rounded-lg px-5 text-sm font-medium'
                render={<Link to='/playground' />}
              >
                {t('Open Playground')}
                <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
              </Button>
              <Button
                variant='outline'
                className='border-border/50 hover:border-border hover:bg-muted/50 h-11 rounded-lg px-5 text-sm font-medium'
                render={<Link to='/templates' />}
              >
                {t('Browse templates')}
              </Button>
            </>
          ) : (
            <>
              <Button
                className='group h-11 rounded-lg px-5 text-sm font-medium'
                render={<Link to='/sign-up' />}
              >
                {t('Get Started')}
                <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
              </Button>
              <Button
                variant='outline'
                className='border-border/50 hover:border-border hover:bg-muted/50 h-11 rounded-lg px-5 text-sm font-medium'
                render={<Link to='/templates' />}
              >
                {t('Browse templates')}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
