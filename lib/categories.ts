import {
  Cake, PartyPopper, Heart, Sparkles, Baby, Users, GraduationCap,
  Mountain, Languages, Globe, HeartHandshake, Palette, BookOpen, Star,
  UtensilsCrossed, Ship, ChefHat, Tent, Flame, Compass, Camera,
  type LucideIcon,
} from 'lucide-react'

/**
 * Emotional, scenario-based marketplace taxonomy (Phase 9). Three layers move
 * discovery away from generic SaaS categories toward real moments and
 * communities. Keys are enum-safe (lowercase, underscores) and must match the
 * `activity_category` enum extended in migration 016.
 */
export type CategoryGroup = 'personal' | 'community' | 'premium'

export interface CategoryDef {
  key: string
  group: CategoryGroup
  icon: LucideIcon
}

export const CATEGORY_GROUPS: CategoryGroup[] = ['personal', 'community', 'premium']

/** Warm, premium gradients used for category art and group accents. */
export const GROUP_GRADIENT: Record<CategoryGroup, string> = {
  personal: 'from-rose-400 via-orange-400 to-amber-300',
  community: 'from-emerald-400 via-teal-400 to-cyan-400',
  premium: 'from-violet-500 via-fuchsia-400 to-amber-300',
}

export const GROUP_ACCENT: Record<CategoryGroup, string> = {
  personal: 'text-rose-600 bg-rose-50',
  community: 'text-emerald-600 bg-emerald-50',
  premium: 'text-violet-600 bg-violet-50',
}

export const CATEGORIES: CategoryDef[] = [
  // A — Personal & Family Events
  { key: 'birthday', group: 'personal', icon: Cake },
  { key: 'kids_party', group: 'personal', icon: PartyPopper },
  { key: 'wedding', group: 'personal', icon: Heart },
  { key: 'anniversary', group: 'personal', icon: Sparkles },
  { key: 'baby_shower', group: 'personal', icon: Baby },
  { key: 'reunion', group: 'personal', icon: Users },
  { key: 'graduation', group: 'personal', icon: GraduationCap },
  // B — Community & Identity Gatherings
  { key: 'hiking_club', group: 'community', icon: Mountain },
  { key: 'language_meetup', group: 'community', icon: Languages },
  { key: 'cultural_community', group: 'community', icon: Globe },
  { key: 'faith_community', group: 'community', icon: HeartHandshake },
  { key: 'hobby_group', group: 'community', icon: Palette },
  { key: 'alumni', group: 'community', icon: BookOpen },
  { key: 'fan_community', group: 'community', icon: Star },
  // C — Premium / Extreme / Niche Experiences
  { key: 'luxury_picnic', group: 'premium', icon: UtensilsCrossed },
  { key: 'sunset_yacht', group: 'premium', icon: Ship },
  { key: 'private_chef', group: 'premium', icon: ChefHat },
  { key: 'glamping', group: 'premium', icon: Tent },
  { key: 'volcano_dinner', group: 'premium', icon: Flame },
  { key: 'survival_camp', group: 'premium', icon: Compass },
  { key: 'underwater_photography', group: 'premium', icon: Camera },
]

export const CATEGORIES_BY_GROUP: Record<CategoryGroup, CategoryDef[]> = {
  personal: CATEGORIES.filter((c) => c.group === 'personal'),
  community: CATEGORIES.filter((c) => c.group === 'community'),
  premium: CATEGORIES.filter((c) => c.group === 'premium'),
}

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]))

/** Legacy categories (kept for activities created before Phase 9). */
const LEGACY_ICON: Record<string, LucideIcon> = {
  sports: Mountain, arts: Palette, music: Star, education: BookOpen,
  outdoor: Tent, wellness: Heart, workshop: Sparkles, party: PartyPopper,
  food: UtensilsCrossed, other: Sparkles,
}
const LEGACY_GROUP: Record<string, CategoryGroup> = {
  sports: 'community', arts: 'community', music: 'community', education: 'community',
  outdoor: 'community', wellness: 'personal', workshop: 'community', party: 'personal',
  food: 'premium', other: 'community',
}

/**
 * Visual treatment for an activity card with no photo: a warm category-colored
 * gradient + icon, so the marketplace feels rich even without imagery. Falls
 * back gracefully for legacy or unknown categories.
 */
export function categoryArt(category: string | null): { gradient: string; Icon: LucideIcon } {
  if (category && BY_KEY.has(category)) {
    const def = BY_KEY.get(category)!
    return { gradient: GROUP_GRADIENT[def.group], Icon: def.icon }
  }
  if (category && LEGACY_ICON[category]) {
    return { gradient: GROUP_GRADIENT[LEGACY_GROUP[category]], Icon: LEGACY_ICON[category] }
  }
  return { gradient: GROUP_GRADIENT.community, Icon: Sparkles }
}
