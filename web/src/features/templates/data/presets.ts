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
export type TemplateCategory =
  | 'short-video'
  | 'product-ad'
  | 'image-style'
  | 'drama-shot'

export type TemplateTarget = 'video' | 'chat'

export interface TemplatePreset {
  id: string
  category: TemplateCategory
  /** i18n key (English source string) rendered as the card title. */
  title: string
  /** i18n key (English source string) rendered as the card description. */
  description: string
  /** Inline gradient placeholder for the cover; replace with a real `cover`
   *  image URL later without touching the consumers. */
  cover: { from: string; to: string }
  /** Which playground surface the template deep-links into. */
  target: TemplateTarget
  /** Model preselected in the playground. */
  model: string
  /** Prompt prefilled in the playground (sent to the model as-is). */
  prompt: string
  /** Aspect ratio, one of the playground size whitelist values. */
  size: string
}

export const VIDEO_MODEL = 'agnes-video-v2.0'
export const IMAGE_MODEL = 'agnes-image-2.1-flash'

export const TEMPLATE_CATEGORY_IDS: TemplateCategory[] = [
  'short-video',
  'product-ad',
  'image-style',
  'drama-shot',
]

/** i18n keys (English source strings) for the category tab/ badge labels. */
export const TEMPLATE_CATEGORY_LABEL_KEYS: Record<TemplateCategory, string> = {
  'short-video': 'Short Video',
  'product-ad': 'Product Ad',
  'image-style': 'Image Style',
  'drama-shot': 'Drama Shot',
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'sv-neon-city-walk',
    category: 'short-video',
    title: 'Neon City Walk',
    description: 'Cinematic night walk through a rain-soaked neon city.',
    cover: { from: '#312e81', to: '#7c3aed' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'Cinematic tracking shot following a person walking through a rain-soaked city street at night, neon signs reflecting on wet pavement, shallow depth of field, moody atmosphere, 35mm film look',
    size: '9:16',
  },
  {
    id: 'sv-food-broll',
    category: 'short-video',
    title: 'Food B-Roll',
    description: 'Slow-motion close-ups of steaming, glossy dishes.',
    cover: { from: '#7c2d12', to: '#f59e0b' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'Slow-motion close-up of a steaming dish being garnished, glistening sauce drizzled over fresh ingredients, warm restaurant lighting, macro lens detail, appetizing food commercial style',
    size: '9:16',
  },
  {
    id: 'sv-street-fashion-cut',
    category: 'short-video',
    title: 'Street Fashion Cut',
    description: 'Fast-cut outfit transitions on city streets.',
    cover: { from: '#111827', to: '#ec4899' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'Fast-cut fashion montage of a model in layered streetwear posing on a city sidewalk, snap zooms, hard sunlight and deep shadows, editorial lookbook energy, dynamic transitions',
    size: '9:16',
  },
  {
    id: 'sv-travel-transition',
    category: 'short-video',
    title: 'Travel Transition',
    description: 'Seamless travel vlog transitions across landscapes.',
    cover: { from: '#064e3b', to: '#14b8a6' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'A traveler spinning in a mountain meadow seamlessly transitions to a beach at golden hour, whip-pan transition, vibrant natural colors, wanderlust travel vlog style',
    size: '9:16',
  },
  {
    id: 'pa-unboxing-reveal',
    category: 'product-ad',
    title: 'Unboxing Reveal',
    description: 'Premium unboxing with soft studio lighting.',
    cover: { from: '#1e293b', to: '#8b5cf6' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'Elegant product unboxing sequence, hands lifting a premium gadget from its packaging, soft studio lighting with gentle rim light, floating dust particles, luxury commercial style',
    size: '16:9',
  },
  {
    id: 'pa-360-product-spin',
    category: 'product-ad',
    title: '360 Product Spin',
    description: 'Smooth 360-degree rotation on a clean backdrop.',
    cover: { from: '#0c4a6e', to: '#38bdf8' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'A sleek product rotating 360 degrees on an invisible pedestal, seamless loop, clean infinite white backdrop, soft shadows, crisp e-commerce studio lighting',
    size: '1:1',
  },
  {
    id: 'pa-liquid-splash',
    category: 'product-ad',
    title: 'Liquid Splash',
    description: 'High-speed splash shots for drinks and cosmetics.',
    cover: { from: '#155e75', to: '#22d3ee' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'High-speed shot of a cosmetic bottle dropped into crystal-clear water creating a dynamic splash, frozen droplets suspended mid-air, backlit studio setup, ultra sharp',
    size: '16:9',
  },
  {
    id: 'pa-minimal-studio',
    category: 'product-ad',
    title: 'Minimal Studio Shot',
    description: 'Clean minimal product photography on pastel sets.',
    cover: { from: '#57534e', to: '#d6d3d1' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'Minimalist product video on a pastel set, single soft shadow, gentle camera push-in, matte ceramic and fabric textures, calm premium aesthetic',
    size: '1:1',
  },
  {
    id: 'is-anime-key-visual',
    category: 'image-style',
    title: 'Anime Key Visual',
    description: 'Vibrant anime-style key visual with rich detail.',
    cover: { from: '#9d174d', to: '#f472b6' },
    target: 'chat',
    model: IMAGE_MODEL,
    prompt:
      'Anime key visual of a heroine standing on a rooftop at sunset, dramatic clouds, detailed background art, vibrant cel shading, official poster quality',
    size: '3:4',
  },
  {
    id: 'is-cyberpunk-scene',
    category: 'image-style',
    title: 'Cyberpunk Scene',
    description: 'Neon-drenched cyberpunk city scenes.',
    cover: { from: '#4c1d95', to: '#06b6d4' },
    target: 'chat',
    model: IMAGE_MODEL,
    prompt:
      'Cyberpunk city street scene at night, towering holographic advertisements, neon pink and cyan palette, rain-slicked streets reflecting light, dense atmospheric detail',
    size: '16:9',
  },
  {
    id: 'is-watercolor-illustration',
    category: 'image-style',
    title: 'Watercolor Illustration',
    description: 'Soft watercolor illustrations with gentle blends.',
    cover: { from: '#1e40af', to: '#93c5fd' },
    target: 'chat',
    model: IMAGE_MODEL,
    prompt:
      'Watercolor illustration of a quiet countryside cottage surrounded by blooming gardens, soft pigment bleeds, gentle washes of color, hand-painted storybook feel',
    size: '1:1',
  },
  {
    id: 'is-film-portrait',
    category: 'image-style',
    title: 'Film Portrait',
    description: '35mm film-style portraits with natural grain.',
    cover: { from: '#78350f', to: '#fbbf24' },
    target: 'chat',
    model: IMAGE_MODEL,
    prompt:
      '35mm film portrait of a young woman by a window, warm afternoon light, natural skin texture, subtle film grain, Kodak Portra color palette, shallow depth of field',
    size: '3:4',
  },
  {
    id: 'ds-confrontation-shot',
    category: 'drama-shot',
    title: 'Confrontation Shot',
    description: 'Tense two-shot confrontation with dramatic lighting.',
    cover: { from: '#18181b', to: '#ef4444' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'Tense cinematic two-shot of two characters facing off in a dim room, single hard light source between them, deep shadows, handheld subtle shake, thriller mood',
    size: '16:9',
  },
  {
    id: 'ds-rainy-night-monologue',
    category: 'drama-shot',
    title: 'Rainy Night Monologue',
    description: 'Moody monologue under rain and streetlights.',
    cover: { from: '#0f172a', to: '#475569' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'Close-up of a lone figure delivering a quiet monologue under a flickering streetlight in heavy rain, water streaming down the lens, blue night tones, melancholic drama',
    size: '9:16',
  },
  {
    id: 'ds-chase-sequence',
    category: 'drama-shot',
    title: 'Chase Sequence',
    description: 'Handheld chase sequence through narrow alleys.',
    cover: { from: '#292524', to: '#f97316' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'Handheld chase sequence sprinting through narrow neon-lit alleys, motion blur, rapid direction changes, breathless action pacing, gritty urban night setting',
    size: '16:9',
  },
  {
    id: 'ds-the-reveal',
    category: 'drama-shot',
    title: 'The Reveal',
    description: 'Slow push-in reveal for climactic moments.',
    cover: { from: '#3b0764', to: '#a855f7' },
    target: 'video',
    model: VIDEO_MODEL,
    prompt:
      'Slow cinematic push-in toward a character standing at the end of a long hallway as doors open behind them revealing blinding light, dramatic reveal, rising tension, epic scale',
    size: '16:9',
  },
]

/** Number of presets surfaced on the home page preview strip. */
export const TEMPLATE_PREVIEW_COUNT = 8

const PLAYGROUND_SIZE_WHITELIST = new Set(['16:9', '9:16', '1:1', '4:3', '3:4'])

export interface TemplatePlaygroundSearch {
  mode?: 'video' | 'chat'
  model?: string
  prompt?: string
  size?: string
}

/**
 * Builds the playground deep-link search params for a template.
 * Only whitelist fields are emitted; everything else is ignored so the
 * playground `validateSearch` can safely consume the URL.
 */
export function buildTemplatePlaygroundSearch(
  preset: TemplatePreset
): TemplatePlaygroundSearch {
  const search: TemplatePlaygroundSearch = { mode: preset.target }

  if (preset.model) {
    search.model = preset.model
  }
  if (preset.prompt) {
    search.prompt = preset.prompt
  }
  if (PLAYGROUND_SIZE_WHITELIST.has(preset.size)) {
    search.size = preset.size
  }

  return search
}
