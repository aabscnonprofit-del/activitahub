// Concept Funnel — OPE pre-stage (see docs/OPE_CONCEPT_FUNNEL_V1.md).
//
// Turns a vague / imaginative / theme-based / under-specified RAW idea into a small set
// of safe, plausible CONCEPT options the user can choose between, BEFORE classification
// and planning. It explores MEANING and DIRECTION — it does NOT ask operational questions
// (how many / what budget / where): those stay with the Clarification Engine, which runs
// later, inside generatePlan. An operationally-clear brief BYPASSES the funnel untouched.
//
// Pure & deterministic: no engine, no network, no AI. Concept generation is template-based
// over interpretation "lenses"; an optional injectable ConceptGenerator lets an AI source
// be plugged in later WITHOUT changing this contract. Nothing here imports or mutates the
// planner, so existing OPE behaviour is unchanged — callers opt in via the funnel entry.

import { extractFromText } from './request-text'

/** One possible reading of the user's idea (the unit the user selects between). */
export interface ConceptOption {
  title: string
  interpretation: string
  mood: string
  suitable_for: string
  risks_or_safety_notes: string
  why_this_matches_request: string
}

export type ConceptFunnelStatus =
  | 'concept_selection_needed'
  | 'concept_selected'
  | 'bypass_concept_funnel'

/** Canonical Concept Funnel output contract. */
export interface ConceptFunnelResult {
  original_request: string
  detected_event_category: string | null
  concept_options: ConceptOption[]
  selected_concept: ConceptOption | null
  clarification_prompt: string
  status: ConceptFunnelStatus
}

type Audience = 'children' | 'adults' | 'mixed' | 'unknown'

/** Injectable concept generator. Default is deterministic; AI can be plugged in later. */
export type ConceptGenerator = (ctx: {
  request: string
  theme: string | null
  category: string | null
  audience: Audience
}) => ConceptOption[]

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const CATEGORY_LABEL: Record<string, string> = {
  birthday: 'birthday party',
  adult_birthday: 'birthday celebration',
  anniversary: 'anniversary',
  graduation: 'graduation',
  family_reunion: 'family reunion',
  bbq: 'BBQ / cookout',
  networking: 'networking event',
  fitness_class: 'fitness class',
  art_class: 'art class',
  language_class: 'language class',
  workshop: 'workshop',
}
const catLabel = (c: string | null): string => (c && CATEGORY_LABEL[c]) || 'event'

// Words that are never the "theme" (articles, verbs, audience, generic event nouns).
const THEME_STOP = new Set([
  'i', 'we', 'a', 'an', 'the', 'some', 'for', 'my', 'our', 'want', 'would', 'like',
  'to', 'have', 'of', 'kids', 'kid', 'children', 'child', 'son', 'daughter', 'please',
  'birthday', 'party', 'event', 'wedding', 'bbq', 'really', 'super',
])

/** Pull the theme phrase that precedes "theme/themed" (e.g. "Antarctica-themed" → "Antarctica"). */
export function detectTheme(text: string): string | null {
  const t = (text || '').replace(/-/g, ' ')
  const idx = t.toLowerCase().search(/\bthemed?\b/)
  if (idx < 0) return null
  const before = t.slice(0, idx).trim().split(/\s+/)
  const picked: string[] = []
  for (let i = before.length - 1; i >= 0 && picked.length < 3; i--) {
    const w = before[i].replace(/[^A-Za-z0-9'&]/g, '')
    if (!w) continue
    if (THEME_STOP.has(w.toLowerCase())) break
    picked.unshift(w)
  }
  return picked.length ? picked.map(cap).join(' ') : null
}

function detectAudience(text: string): Audience {
  const t = (text || '').toLowerCase()
  const kids = /\bkids?\b|\bchild(?:ren)?\b|\bson\b|\bdaughter\b|\btoddler/.test(t)
  const adults = /\badults?\b|\bcorporate\b|\bcolleagues?\b|\bteam\b|\bstaff\b/.test(t)
  if (kids && adults) return 'mixed'
  if (kids) return 'children'
  if (adults) return 'adults'
  return 'unknown'
}

// Imaginative / emotional / theme cues that pull a request into the funnel.
const IMAGINATIVE =
  /\b(theme[d]?|magical|unforgettable|royal|dream|epic|fantasy|wonderland|amazing|spectacular|surprise|unique|creative|whimsical|enchant(?:ed|ing)|adventure|mystical|fairy ?tale|once[- ]in[- ]a[- ]lifetime|something special|wow)\b/i

/**
 * Decide whether a raw request should enter the funnel, and surface the signals used.
 * Operationally clear = a real category plus enough concrete anchors (headcount / budget /
 * venue / timing) and no theme or imaginative pull → bypass. Anything else with content
 * enters. Reuses the deterministic anchor parser (extractFromText) — no new parsing.
 */
export function assessConceptEntry(request: string): {
  enter: boolean
  theme: string | null
  category: string | null
  audience: Audience
  imaginative: boolean
  anchors: number
  operationallyClear: boolean
} {
  const text = (request || '').trim()
  const ext = extractFromText(text)
  const theme = detectTheme(text)
  const imaginative = IMAGINATIVE.test(text)
  const anchors =
    (ext.category != null ? 1 : 0) +
    (ext.guestCount != null ? 1 : 0) +
    (ext.budget != null ? 1 : 0) +
    (ext.venueType != null ? 1 : 0) +
    (ext.timeframe != null ? 1 : 0)
  const hasContent = text.length > 0 && /[a-z]/i.test(text)
  const operationallyClear = ext.category != null && anchors >= 3 && !theme && !imaginative
  return {
    enter: hasContent && !operationallyClear,
    theme,
    category: ext.category,
    audience: detectAudience(text),
    imaginative,
    anchors,
    operationallyClear,
  }
}

function audienceLabel(a: Audience, category: string | null): string {
  switch (a) {
    case 'children': return 'young children and their families'
    case 'adults': return 'an adult group'
    case 'mixed': return 'a mix of children and adults'
    default: return category === 'birthday' ? 'young children and their families' : 'a general group'
  }
}

// ── Theme lenses: an explicit "<X>-themed" idea → X-specific directions ────────────────
const THEME_LENSES: { key: string; suffix: string; interp: (t: string) => string; mood: string; why: string }[] = [
  { key: 'playful', suffix: 'Playful & Festive', interp: (t) => `${t} as playful decor, colours, costumes and a warm, festive atmosphere.`, mood: 'cheerful, colourful, lighthearted', why: 'leans into the fun, decorative side of the idea' },
  { key: 'adventure', suffix: 'Adventure & Mission', interp: (t) => `${t} as an adventure or mission — explorers, light challenges and a sense of expedition.`, mood: 'exciting, energetic, brave', why: 'reads the idea as an active, story-driven adventure' },
  { key: 'discovery', suffix: 'Discovery & Nature', interp: (t) => `${t} as discovery and gentle learning — wildlife, science and hands-on curiosity.`, mood: 'curious, calm, educational', why: 'reads the idea as a nature and discovery experience' },
  { key: 'story', suffix: 'Story & Characters', interp: (t) => `${t} as a story world — characters, roles and an imaginative narrative to step into.`, mood: 'imaginative, immersive, narrative', why: 'reads the idea as an immersive story world' },
]

function themeSafety(lensKey: string, audience: Audience): string {
  const kids = audience === 'children' || audience === 'mixed'
  if (!kids) return 'Confirm any dietary, accessibility and alcohol considerations for the group.'
  switch (lensKey) {
    case 'playful': return 'Keep decor child-safe (no small or choking-size pieces); keep any fake snow, water or slippery surfaces dry and supervised.'
    case 'adventure': return 'Keep any mission activities age-appropriate and well-supervised; avoid real heights, water or hazards.'
    case 'discovery': return 'Supervise any animal or nature contact; keep handling gentle and hygienic.'
    case 'story': return 'Keep costumes and props non-restrictive and flame-safe; ensure children can see and move freely.'
    default: return 'Keep all activities age-appropriate and supervised; confirm allergies and access needs.'
  }
}

function themeOptions(theme: string, category: string | null, audience: Audience): ConceptOption[] {
  const suitable = audienceLabel(audience, category)
  return THEME_LENSES.map((L) => ({
    title: `${theme} — ${L.suffix}`,
    interpretation: L.interp(theme),
    mood: L.mood,
    suitable_for: suitable,
    risks_or_safety_notes: themeSafety(L.key, audience),
    why_this_matches_request: `Takes your "${theme}" idea and ${L.why}.`,
  }))
}

// ── Intent-pattern layer ──────────────────────────────────────────────────────────────
// Recognises common high-value event DREAMS by intention (not just a keyword) and offers
// the specific, distinct directions a real organizer would suggest. First match wins,
// ordered most-specific first. Runs only when there is no explicit theme. Deterministic —
// no AI; this is the quality floor when the AI concept generator is off.
interface Seed { title: string; interpretation: string; mood: string; suitable_for: string; risk: string; why: string }
const seed = (s: Seed): ConceptOption => ({
  title: s.title,
  interpretation: s.interpretation,
  mood: s.mood,
  suitable_for: s.suitable_for,
  risks_or_safety_notes: s.risk,
  why_this_matches_request: s.why,
})

const PROPOSAL: Seed[] = [
  { title: 'Private Sunset / Beach Proposal', interpretation: 'An intimate proposal at a scenic spot — beach, lookout or garden — timed to golden hour, just the two of you.', mood: 'romantic, intimate, breathtaking', suitable_for: 'a couple, in private', risk: 'Check tides, terrain and weather; keep the spot genuinely private and have a quiet backup.', why: 'reads a beautiful proposal as a private, scenic golden-hour moment' },
  { title: 'Intimate Dinner Proposal', interpretation: 'A carefully set dinner — private table, favourite food, the question over dessert or a personal toast.', mood: 'warm, elegant, personal', suitable_for: 'a couple, optionally a private room', risk: 'Confirm dietary needs and brief discreet staff so the moment stays undisturbed.', why: 'reads beautiful as an intimate, elegant dinner moment' },
  { title: 'Surprise Proposal with Friends and Family', interpretation: 'Loved ones secretly gathered to celebrate the instant she says yes — a hidden group reveal.', mood: 'joyful, surprising, shared', suitable_for: 'a couple plus close friends and family', risk: 'Coordinate timing and secrecy; make sure she would welcome a shared, public moment.', why: 'reads beautiful as a shared surprise celebration' },
  { title: 'Scenic Adventure Proposal', interpretation: 'The question at the peak of a memorable experience — a hike viewpoint, boat or sunrise spot.', mood: 'adventurous, memorable, cinematic', suitable_for: 'an active couple', risk: 'Match the activity to both people; plan weather, footing and a safe backup.', why: 'reads beautiful as an adventurous, cinematic moment' },
  { title: 'Elegant Rooftop / Hotel Proposal', interpretation: 'A refined setting — rooftop skyline, suite or fine venue — styled for a polished wow moment.', mood: 'luxurious, polished, dramatic', suitable_for: 'a couple who enjoy a touch of glamour', risk: 'Confirm venue rules and privacy; arrange styling or photography discreetly.', why: 'reads beautiful as an elegant, upscale moment' },
]

const LUXURY_WELLNESS: Seed[] = [
  { title: 'Luxury Wellness Retreat', interpretation: 'A premium half or full day — yoga, spa touches, healthy gourmet food and total comfort.', mood: 'serene, indulgent, restorative', suitable_for: 'an affluent, wellness-minded adult audience', risk: 'Confirm dietary, allergy and mobility needs; vet premium vendors for reliability.', why: 'reads for very rich people as a high-end restorative retreat' },
  { title: 'Private Villa Yoga Experience', interpretation: 'An exclusive session at a private villa or estate with a top instructor and a small, curated guest list.', mood: 'exclusive, calm, elevated', suitable_for: 'a small premium group', risk: 'Ensure the space is safe and accessible; confirm privacy and venue insurance.', why: 'matches the exclusive, premium expectation of the request' },
  { title: 'Executive Stress-Reset Session', interpretation: 'A focused yoga and breathwork session for busy high performers to decompress and recharge.', mood: 'focused, calming, premium', suitable_for: 'executives and professionals', risk: 'Offer modifications for varying fitness; confirm any health conditions.', why: 'frames yoga as a premium reset for a high-status audience' },
  { title: 'Premium Oceanfront Sunrise Yoga', interpretation: 'A signature sunrise flow at a stunning oceanfront setting, finished with a luxe healthy breakfast.', mood: 'breathtaking, peaceful, aspirational', suitable_for: 'a premium adult audience', risk: 'Plan for weather, sun and footing; provide water, shade and mats.', why: 'delivers the aspirational, high-end yoga the request implies' },
  { title: 'High-End Healthy-Lifestyle Gathering', interpretation: 'Yoga as the centrepiece of a refined lifestyle event — wellness, gourmet food and elegant networking.', mood: 'sophisticated, healthy, social', suitable_for: 'affluent, lifestyle-oriented guests', risk: 'Confirm dietary needs and accessibility; curate vendors to a premium standard.', why: 'reads the request as a premium lifestyle gathering, not a basic class' },
]

const ELDERLY: Seed[] = [
  { title: 'Gentle Music and Memory Evening', interpretation: 'Familiar songs from their era, sing-alongs and shared memories — warm, low-key and joyful.', mood: 'nostalgic, warm, gentle', suitable_for: 'older adults, including those with limited mobility', risk: 'Keep volume hearing-friendly; ensure comfortable seating and step-free access.', why: 'reads an evening for elderly people as a gentle, nostalgic gathering' },
  { title: 'Chair-Friendly Social Games Night', interpretation: 'Seated games — bingo, trivia, cards — designed so everyone can join from their chair.', mood: 'playful, social, easy', suitable_for: 'seniors of mixed ability', risk: 'Use large print and clear audio; keep walkways clear and the pace relaxed.', why: 'turns the idea into an inclusive, seated social activity' },
  { title: 'Storytelling and Life-Memories Circle', interpretation: 'A facilitated circle where residents share stories and life memories — connection and dignity.', mood: 'reflective, intimate, meaningful', suitable_for: 'older adults who enjoy conversation', risk: 'Be sensitive to memory and emotion; keep sessions short and comfortable.', why: 'reads the request as a meaningful, connection-focused evening' },
  { title: 'Light Movement and Wellness Session', interpretation: 'Gentle chair exercises, stretching and breathing — feel-good movement at an easy pace.', mood: 'soothing, healthy, calm', suitable_for: 'seniors, including limited-mobility participants', risk: 'Confirm medical and mobility limits; keep movements seated and supervised.', why: 'frames the evening as gentle, health-supporting movement' },
  { title: 'Cozy Tea, Conversation and Community Night', interpretation: 'A warm tea-and-treats evening built around relaxed conversation and a sense of community.', mood: 'cozy, friendly, unhurried', suitable_for: 'older adults and care staff', risk: 'Check dietary restrictions and choking-safe foods; ensure easy, step-free access.', why: 'reads the idea as a cozy, community-centred evening' },
]

const FENG_SHUI: Seed[] = [
  { title: 'Workspace Energy Reset', interpretation: 'A guided reset of the workspace — declutter, light, plants and flow — so the room feels calm and productive.', mood: 'calm, fresh, intentional', suitable_for: 'professionals and remote workers', risk: 'Low risk — keep walkways clear and the space well-ventilated and accessible.', why: 'reads feng shui coworking as a calming workspace energy reset' },
  { title: 'Mindful Networking Coworking Day', interpretation: 'A coworking day blending focused work with mindful, low-pressure networking and shared intention-setting.', mood: 'focused, connected, balanced', suitable_for: 'founders, freelancers and small teams', risk: 'Low risk — provide quiet zones and comfortable, accessible seating.', why: 'combines coworking with the calm, intentional feel of feng shui' },
  { title: 'Desk Arrangement and Flow Workshop', interpretation: 'A hands-on workshop applying feng shui principles to desk layout, lighting and flow for better focus.', mood: 'practical, mindful, hands-on', suitable_for: 'office workers and remote professionals', risk: 'Low risk — keep any rearranged furniture stable and pathways clear.', why: 'turns feng shui into a practical workspace-flow workshop' },
  { title: 'Productivity and Environment Design Session', interpretation: 'A session on designing the environment for productivity — energy, order and atmosphere by design.', mood: 'sharp, calm, design-led', suitable_for: 'professionals and teams', risk: 'Low risk — keep the room comfortable, lit and accessible.', why: 'frames the idea as deliberate, productivity-focused environment design' },
  { title: 'Calm Focus Coworking Experience', interpretation: 'A serene coworking experience — soft lighting, plants, quiet focus blocks and gentle breaks.', mood: 'serene, focused, restorative', suitable_for: 'remote workers seeking calm focus', risk: 'Low risk — ensure ventilation, comfortable seating and step-free access.', why: 'delivers the calm, flow-friendly atmosphere feng shui implies' },
]

const ROMANTIC: Seed[] = [
  { title: 'Intimate Dinner for Two', interpretation: 'A private, beautifully set dinner focused on connection — favourite food and an unhurried evening.', mood: 'warm, intimate, elegant', suitable_for: 'a couple', risk: 'Confirm dietary needs; arrange a private, undisturbed setting.', why: 'reads a romantic occasion as an intimate dinner' },
  { title: 'Sunset / Scenic Evening', interpretation: 'A scenic evening — beach, rooftop or lookout — timed to sunset for a memorable backdrop.', mood: 'romantic, scenic, calm', suitable_for: 'a couple', risk: 'Plan for weather and footing; have a comfortable backup spot.', why: 'reads romantic as a scenic, sunset-led evening' },
  { title: 'Weekend Getaway Experience', interpretation: 'A short getaway built around an experience — spa, nature or a city escape together.', mood: 'special, relaxing, memorable', suitable_for: 'a couple', risk: 'Confirm travel and accommodation logistics in advance.', why: 'reads romantic as a getaway experience' },
  { title: 'Surprise Celebration', interpretation: 'A thoughtful surprise — decorations, a favourite activity, or close friends in on the secret.', mood: 'joyful, surprising, heartfelt', suitable_for: 'a couple, optionally close friends', risk: 'Coordinate the surprise carefully; ensure it would be welcome.', why: 'reads romantic as a heartfelt surprise' },
  { title: 'Cozy At-Home Romantic Setup', interpretation: 'An at-home evening transformed — lighting, music, a home-cooked or catered meal and total comfort.', mood: 'cozy, personal, warm', suitable_for: 'a couple', risk: 'Low risk — confirm dietary needs and keep candles fire-safe.', why: 'reads romantic as a cozy, personal at-home evening' },
]

const CORPORATE: Seed[] = [
  { title: 'Structured Networking with Intros', interpretation: 'A facilitated evening with guided introductions and small-group rotations so everyone connects.', mood: 'professional, energetic, purposeful', suitable_for: 'professionals and founders', risk: 'Provide name badges and quiet corners; confirm dietary needs for catering.', why: 'reads a networking event as structured and high-connection' },
  { title: 'Talks / Panel plus Mingling', interpretation: 'A short panel or talks followed by relaxed mingling — value first, then connection.', mood: 'insightful, social, polished', suitable_for: 'an industry audience', risk: 'Confirm AV and accessibility; keep the schedule tight.', why: 'reads the request as a content-led professional evening' },
  { title: 'Casual After-Work Social', interpretation: 'A low-pressure after-work gathering — drinks, food and easy conversation.', mood: 'relaxed, friendly, social', suitable_for: 'colleagues and professionals', risk: 'Manage alcohol responsibly; offer non-alcoholic options.', why: 'reads it as a relaxed, social professional evening' },
  { title: 'Collaborative Workshop Session', interpretation: 'A hands-on session where attendees solve a shared problem or build something together.', mood: 'focused, collaborative, hands-on', suitable_for: 'teams and founders', risk: 'Confirm materials and accessible seating; keep groups balanced.', why: 'reads the request as a collaborative, productive format' },
  { title: 'Industry Showcase Evening', interpretation: 'A showcase of work, demos or startups, with mingling and light refreshments.', mood: 'vibrant, professional, celebratory', suitable_for: 'an industry and startup audience', risk: 'Confirm power, AV and crowd flow; plan catering for the headcount.', why: 'reads it as a showcase-style professional event' },
]

const COMMUNITY: Seed[] = [
  { title: 'Shared Meal / Potluck Evening', interpretation: 'A warm community evening built around a shared or potluck meal and easy conversation.', mood: 'warm, inclusive, friendly', suitable_for: 'a local community group', risk: 'Label foods for allergens; ensure step-free access and seating.', why: 'reads a social evening as a shared-meal community night' },
  { title: 'Games and Activities Social', interpretation: 'An evening of group games and light activities that get people talking and laughing.', mood: 'playful, lively, social', suitable_for: 'all ages in the community', risk: 'Match activities to the mix; keep the space safe and supervised.', why: 'reads it as an activity-led social evening' },
  { title: 'Live Music / Open-Mic Night', interpretation: 'A relaxed evening with live or open-mic music, food and a friendly crowd.', mood: 'lively, expressive, warm', suitable_for: 'a community audience', risk: 'Confirm AV and volume limits; manage any alcohol responsibly.', why: 'reads it as a music-led community night' },
  { title: 'Themed Cultural Evening', interpretation: 'An evening celebrating a culture, season or theme — food, music and shared traditions.', mood: 'colourful, meaningful, festive', suitable_for: 'a diverse community group', risk: 'Be respectful and inclusive; label foods and confirm access needs.', why: 'reads it as a meaningful, themed community evening' },
  { title: 'Conversation and Connection Night', interpretation: 'A facilitated evening focused on real conversation, meeting neighbours and building connection.', mood: 'calm, friendly, genuine', suitable_for: 'neighbours and community members', risk: 'Low risk — provide comfortable, accessible seating and a welcoming setup.', why: 'reads it as a connection-focused community night' },
]

const CLASS_IDEA: Seed[] = [
  { title: 'Beginner-Friendly Intro Session', interpretation: 'A welcoming first session that gets complete beginners comfortable and trying it hands-on.', mood: 'welcoming, encouraging, easy', suitable_for: 'beginners', risk: 'Confirm materials and accessible space; keep group sizes manageable.', why: 'reads a class idea as an approachable intro session' },
  { title: 'Hands-On Practical Workshop', interpretation: 'A focused workshop where participants make or do something concrete and take it away.', mood: 'practical, focused, satisfying', suitable_for: 'motivated learners', risk: 'Confirm materials, tools and any safety briefing for hands-on work.', why: 'reads it as a practical, outcome-led workshop' },
  { title: 'Recurring Series / Program', interpretation: 'A multi-session series that builds skill over time and a returning community of learners.', mood: 'progressive, committed, social', suitable_for: 'learners wanting real progress', risk: 'Plan attendance and continuity; confirm a consistent space and instructor.', why: 'reads it as an ongoing, skill-building program' },
  { title: 'Expert Masterclass', interpretation: 'A premium session led by an expert, going deeper for more advanced or aspiring participants.', mood: 'inspiring, premium, focused', suitable_for: 'keen or advanced learners', risk: 'Confirm the instructor and capacity; match the level to the audience.', why: 'reads it as a high-value expert masterclass' },
  { title: 'Social Learning plus Practice Meetup', interpretation: 'A relaxed meetup that mixes light teaching with practice and socialising.', mood: 'social, relaxed, hands-on', suitable_for: 'hobbyists and social learners', risk: 'Keep it inclusive; confirm space, materials and access needs.', why: 'reads it as a social, practice-based learning meetup' },
]

const BIRTHDAY_KIDS: Seed[] = [
  { title: 'Classic Party: Games, Cake and Friends', interpretation: 'A timeless kids party — party games, cake, decorations and lots of friends.', mood: 'fun, festive, joyful', suitable_for: 'young children and their families', risk: 'Provide enough adult supervision; check allergies and keep play areas safe.', why: 'reads a kids birthday as a classic, joyful party' },
  { title: 'Character or Themed Adventure', interpretation: 'A party built around a favourite character or theme, with matching activities and decor.', mood: 'imaginative, playful, exciting', suitable_for: 'young children', risk: 'Keep costumes and props child-safe; supervise themed activities.', why: 'reads it as a themed, imaginative celebration' },
  { title: 'Outdoor Play and Activity Day', interpretation: 'An active outdoor party — games, play equipment or a park gathering with room to run.', mood: 'energetic, outdoorsy, free', suitable_for: 'active young children', risk: 'Watch for road, water and equipment hazards; have shade, water and a weather backup.', why: 'reads it as an active outdoor celebration' },
  { title: 'Creative Crafts and Hands-On Fun', interpretation: 'A calmer party centred on crafts, making and hands-on creativity the kids take home.', mood: 'creative, calm, hands-on', suitable_for: 'young children who love making', risk: 'Use child-safe materials; supervise tools and check allergies.', why: 'reads it as a creative, hands-on celebration' },
  { title: 'Relaxed Family-and-Friends Gathering', interpretation: 'A low-key gathering with close family and a few friends — food, cake and easy play.', mood: 'warm, relaxed, intimate', suitable_for: 'younger children and family', risk: 'Keep an eye on the youngest; confirm allergies and a safe play space.', why: 'reads it as a relaxed, intimate family celebration' },
]

const BIRTHDAY_ADULT: Seed[] = [
  { title: 'Relaxed Dinner with Close Friends', interpretation: 'An easygoing celebration dinner with close friends — good food and unhurried conversation.', mood: 'warm, social, relaxed', suitable_for: 'an adult group', risk: 'Confirm dietary needs; manage alcohol responsibly.', why: 'reads an adult birthday as a relaxed dinner' },
  { title: 'Lively Party with Music and Dancing', interpretation: 'A high-energy party — music, dancing, drinks and a celebratory crowd.', mood: 'lively, fun, energetic', suitable_for: 'an adult group who like to celebrate', risk: 'Manage alcohol and noise; ensure safe transport home.', why: 'reads it as a lively, festive party' },
  { title: 'Outdoor Day Gathering / BBQ', interpretation: 'A daytime outdoor celebration — BBQ or picnic, casual and social.', mood: 'casual, sunny, social', suitable_for: 'an adult group and family', risk: 'Plan shade, water and a weather backup; handle food safely.', why: 'reads it as a casual outdoor celebration' },
  { title: 'Experience-Based Celebration', interpretation: 'A celebration built around an experience — an outing, tasting or activity rather than a venue.', mood: 'memorable, novel, social', suitable_for: 'an adult group', risk: 'Match the activity to the group; confirm bookings and access needs.', why: 'reads it as an experience-led celebration' },
  { title: 'Elegant Milestone Celebration', interpretation: 'A more polished celebration for a milestone — refined venue, special touches and a sense of occasion.', mood: 'elegant, special, considered', suitable_for: 'an adult group marking a milestone', risk: 'Confirm dietary and access needs; vet the venue and vendors.', why: 'reads it as an elegant milestone celebration' },
]

const BBQ_DIR: Seed[] = [
  { title: 'Classic Backyard Cookout', interpretation: 'A relaxed backyard BBQ — grill, sides, drinks and easy conversation.', mood: 'casual, warm, social', suitable_for: 'friends and family', risk: 'Handle grill and food safety; offer shade and water.', why: 'reads a BBQ as a classic backyard cookout' },
  { title: 'Beach or Park Day Gathering', interpretation: 'An outdoor BBQ at a beach or park, with games and room to relax.', mood: 'sunny, active, easygoing', suitable_for: 'friends and family of mixed ages', risk: 'Plan shade, water, sun and a weather backup; check site rules.', why: 'reads it as an outdoor day gathering' },
  { title: 'Potluck-Style Shared Grill', interpretation: 'A shared BBQ where everyone brings a dish — varied food and a community feel.', mood: 'inclusive, friendly, relaxed', suitable_for: 'a group who like to share', risk: 'Label foods for allergens; keep cold foods safe.', why: 'reads it as a shared, potluck-style BBQ' },
  { title: 'Game-Day / Social BBQ', interpretation: 'A BBQ built around a game, match or activity — food plus a shared focus.', mood: 'lively, fun, social', suitable_for: 'friends and colleagues', risk: 'Manage alcohol; keep activity areas safe.', why: 'reads it as a social, activity-led BBQ' },
]

const GRADUATION: Seed[] = [
  { title: 'Proud Family Celebration Dinner', interpretation: 'A celebratory dinner with family to mark the achievement — warm and meaningful.', mood: 'proud, warm, celebratory', suitable_for: 'the graduate and family', risk: 'Confirm dietary needs; reserve a comfortable, accessible setting.', why: 'reads a graduation as a proud family celebration' },
  { title: 'Lively Party with Friends', interpretation: 'A high-energy party with friends — music, food and celebration.', mood: 'lively, fun, social', suitable_for: 'the graduate and friends', risk: 'Manage alcohol and noise; plan safe transport.', why: 'reads it as a lively party with friends' },
  { title: 'Outdoor Day Gathering', interpretation: 'A relaxed outdoor celebration — BBQ or picnic with family and friends.', mood: 'casual, sunny, social', suitable_for: 'a mixed group', risk: 'Plan shade, water and a weather backup.', why: 'reads it as a casual outdoor celebration' },
  { title: 'Milestone Keepsake Gathering', interpretation: 'A thoughtful gathering with photos, speeches and keepsakes to remember the milestone.', mood: 'meaningful, warm, reflective', suitable_for: 'the graduate, family and close friends', risk: 'Confirm AV for any speeches; ensure accessible seating.', why: 'reads it as a meaningful keepsake celebration' },
]

const REUNION: Seed[] = [
  { title: 'Relaxed All-Ages Gathering', interpretation: 'An easygoing reunion with food and conversation that works for every generation.', mood: 'warm, inclusive, relaxed', suitable_for: 'family across generations', risk: 'Provide seating and shade; plan for both children and older guests.', why: 'reads a reunion as a relaxed all-ages gathering' },
  { title: 'Outdoor Picnic and Games Day', interpretation: 'A daytime outdoor reunion — picnic, games and space for kids to play.', mood: 'sunny, active, social', suitable_for: 'families of mixed ages', risk: 'Watch hazards for children; offer shade, water and rest areas for elders.', why: 'reads it as an active outdoor reunion' },
  { title: 'Memory-Sharing Celebration Meal', interpretation: 'A shared meal centred on photos, stories and family memories.', mood: 'nostalgic, warm, meaningful', suitable_for: 'extended family', risk: 'Confirm dietary needs; keep the pace gentle for older guests.', why: 'reads it as a memory-focused reunion meal' },
  { title: 'Activity-Based Reconnection Day', interpretation: 'A reunion built around a shared activity or outing that brings people together.', mood: 'fun, engaging, social', suitable_for: 'family who enjoy doing things together', risk: 'Match the activity to all ages and abilities; confirm access needs.', why: 'reads it as an activity-led reconnection day' },
]

const INTENT_PATTERNS: { id: string; test: RegExp; seeds: Seed[] }[] = [
  { id: 'feng_shui', test: /feng ?shui|cowork|co-work|work ?space|\bdesk\b|office (?:energy|atmosphere|vibe|flow)/i, seeds: FENG_SHUI },
  { id: 'proposal', test: /\bpropos(?:e|al|ing)\b|engagement|\bmarry\b|pop the question/i, seeds: PROPOSAL },
  { id: 'luxury_wellness', test: /(?:rich|wealth|luxur|premium|high[- ]end|\bvip\b|elite|affluent|upscale)[\s\S]{0,40}(?:yoga|wellness|spa|retreat|meditat|mindful|health)|(?:yoga|wellness|spa|retreat|meditat|mindful)[\s\S]{0,40}(?:rich|wealth|luxur|premium|high[- ]end|\bvip\b|elite|affluent|upscale)/i, seeds: LUXURY_WELLNESS },
  { id: 'elderly', test: /elderly|seniors?|retirement home|nursing home|aged care|older (?:people|adults|folks)|grandparent/i, seeds: ELDERLY },
  { id: 'romantic', test: /romantic|anniversary|date night|valentine|surprise (?:for|my) (?:wife|husband|partner|girlfriend|boyfriend|spouse)/i, seeds: ROMANTIC },
  { id: 'corporate', test: /network|corporate|business (?:event|mixer|night|dinner)|startup|founders?|professionals?|conference|team (?:event|building|night|outing)|company (?:event|party|retreat)|\bmixer\b/i, seeds: CORPORATE },
  { id: 'community', test: /community|social (?:night|evening|gathering|event)|get[- ]together|neighbou?rhood|block party|fundrais|charity (?:event|night)/i, seeds: COMMUNITY },
  { id: 'class', test: /\bclass\b|workshop|lesson|course|seminar|masterclass|bootcamp|training session|learn to|\bteach\b/i, seeds: CLASS_IDEA },
]

function categoryDirections(category: string | null, audience: Audience): ConceptOption[] | null {
  const kidsBirthday = category === 'birthday' && audience !== 'adults'
  switch (category) {
    case 'birthday': return (kidsBirthday ? BIRTHDAY_KIDS : BIRTHDAY_ADULT).map(seed)
    case 'adult_birthday': return BIRTHDAY_ADULT.map(seed)
    case 'bbq': return BBQ_DIR.map(seed)
    case 'anniversary': return ROMANTIC.map(seed)
    case 'graduation': return GRADUATION.map(seed)
    case 'family_reunion': return REUNION.map(seed)
    case 'networking': return CORPORATE.map(seed)
    case 'fitness_class':
    case 'art_class':
    case 'language_class':
    case 'workshop': return CLASS_IDEA.map(seed)
    default: return null
  }
}

// Last-resort generic directions — ONLY when there is no theme, no intent match, and no
// known category. The required dream examples never reach this branch.
function styleFallback(category: string | null, audience: Audience): ConceptOption[] {
  const cl = catLabel(category)
  const suitable = audienceLabel(audience, category)
  const lenses: [string, string, string][] = [
    ['Relaxed and Social', `A relaxed, social ${cl} focused on comfort, food and conversation.`, 'easy, warm, unhurried'],
    ['Active and Playful', `An active, playful ${cl} built around games, activities and energy.`, 'lively, fun, energetic'],
    ['Special and Memorable', `A more polished, memorable ${cl} with special touches and a sense of occasion.`, 'elegant, special, considered'],
  ]
  return lenses.map(([suffix, interp, mood]) => ({
    title: `${cap(cl)} — ${suffix}`,
    interpretation: interp,
    mood,
    suitable_for: suitable,
    risks_or_safety_notes: 'Confirm any dietary, accessibility and alcohol considerations; keep activities suitable for the group.',
    why_this_matches_request: `Offers a clear direction for your ${cl}.`,
  }))
}

/**
 * Deterministic concept generator (the default), layered like a real organizer:
 * explicit theme → intent pattern (proposal, luxury wellness, elderly, feng-shui, romantic,
 * corporate, community, class) → category directions → generic last resort. AI can replace
 * this via the ConceptGenerator seam without changing the contract.
 */
export const defaultConceptGenerator: ConceptGenerator = ({ request, theme, category, audience }) => {
  if (theme) return themeOptions(theme, category, audience)
  const t = (request || '').toLowerCase()
  for (const p of INTENT_PATTERNS) {
    if (p.test.test(t)) return p.seeds.map(seed)
  }
  return categoryDirections(category, audience) ?? styleFallback(category, audience)
}

/**
 * Run the Concept Funnel on a raw request. Returns concept options for a vague / themed /
 * under-specified idea (status concept_selection_needed), or a clean bypass for an
 * operationally-clear brief (status bypass_concept_funnel, no options). Pure.
 */
export function runConceptFunnel(request: string, opts: { generate?: ConceptGenerator } = {}): ConceptFunnelResult {
  const a = assessConceptEntry(request)
  const original_request = (request || '').trim()

  if (!a.enter) {
    return {
      original_request,
      detected_event_category: a.category,
      concept_options: [],
      selected_concept: null,
      clarification_prompt: '',
      status: 'bypass_concept_funnel',
    }
  }

  const generate = opts.generate ?? defaultConceptGenerator
  const concept_options = generate({ request: original_request, theme: a.theme, category: a.category, audience: a.audience })

  return {
    original_request,
    detected_event_category: a.category,
    concept_options,
    selected_concept: null,
    clarification_prompt: a.theme
      ? `Your "${a.theme}" idea could go in a few directions. Which feels closest to what you imagine — or describe your own?`
      : `Your idea could go a few different ways. Which direction feels closest — or tell me more about what you picture?`,
    status: 'concept_selection_needed',
  }
}

/** Record the user's choice (by index or title). Sets selected_concept + concept_selected. */
export function selectConcept(result: ConceptFunnelResult, choice: number | string): ConceptFunnelResult {
  let picked: ConceptOption | null = null
  if (typeof choice === 'number') {
    picked = result.concept_options[choice] ?? null
  } else {
    const c = choice.trim().toLowerCase()
    picked =
      result.concept_options.find((o) => o.title.toLowerCase() === c) ??
      result.concept_options.find((o) => o.title.toLowerCase().includes(c)) ??
      null
  }
  if (!picked) return result
  return { ...result, selected_concept: picked, status: 'concept_selected' }
}

/** Fold a chosen concept into the request text so the existing understanding layer carries the direction. */
export function applyConceptToText(originalRequest: string, selected: ConceptOption): string {
  const base = (originalRequest || '').trim()
  return `${base} — concept direction: ${selected.title}. ${selected.interpretation}`.trim()
}

/** A short special-requirement string for a chosen concept (for structured PlannerInput callers). */
export function conceptRequirement(selected: ConceptOption): string {
  return `Concept: ${selected.title} — ${selected.mood}`.slice(0, 120)
}

// ── Scenario recognition ──────────────────────────────────────────────────────────────
// "Scenario First": before CREATING a scenario, OPE checks whether the request ALREADY
// contains a usable one — the story of what should happen. Recognised when the request:
//   (a) enumerates an ordered sequence of happenings (an itinerary), or
//   (b) narrates a sequence of happenings, or
//   (c) is an operationally-clear brief whose standard scenario is implied.
// When recognised, OPE does NOT create a new scenario (the user already told the story).
// Pure & deterministic; reuses assessConceptEntry; introduces no new system.

export type ScenarioSource = 'provided' | 'narrative' | 'operational'
export interface ScenarioRecognition {
  recognized: boolean
  source: ScenarioSource | null
  story: string | null // the recognised story (the request itself), or null when none exists
}

// Activity/place words that mark a real "happening" (used to tell an itinerary from a list).
const HAPPENING =
  /\b(airport|pickup|transfer|hotel|check-?in|dinner|lunch|breakfast|brunch|drinks?|beer|wine|cocktails?|bbq|barbecue|sauna|spa|massage|paintball|bowling|karaoke|hike|hiking|walk|tour|cruise|boat|swim|beach|pool|games?|dance|dancing|party|sunset|fireworks|ceremony|speech(?:es)?|toast|show|concert|museum|tasting)\b/i
// Cues that the request narrates a SEQUENCE of happenings rather than a single ask.
const SEQUENCE_CUE =
  /→|->|—>|→|\bthen\b|\bafter that\b|\bfollowed by\b|\bends? with\b|\bend the (?:evening|night|day)\b|\bfinale\b|culminat\w*|\bwrap(?:s|ping)? up\b/i

function scenarioSegments(text: string): string[] {
  return text
    .split(/→|->|—>|→|;|\bthen\b|\bafter that\b|\bfollowed by\b|,/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && /[a-z]/i.test(s))
}

function looksLikeItinerary(text: string): boolean {
  const hasArrow = /→|->|—>|→/.test(text)
  const segs = scenarioSegments(text)
  if (hasArrow && segs.length >= 3) return true // explicit ordered sequence
  // Comma/"then" list: require enough segments AND that they read as happenings (not an item list).
  return segs.length >= 4 && segs.filter((s) => HAPPENING.test(s)).length >= 3
}

function looksLikeNarrative(text: string): boolean {
  return text.trim().split(/\s+/).length >= 8 && SEQUENCE_CUE.test(text)
}

/**
 * Determine whether a usable scenario already exists in the request. When `recognized`,
 * planning may proceed without creating a scenario; otherwise OPE must create one
 * (via the Concept Funnel) before planning.
 */
export function recognizeScenario(request: string): ScenarioRecognition {
  const text = (request || '').trim()
  if (!text) return { recognized: false, source: null, story: null }
  if (looksLikeItinerary(text)) return { recognized: true, source: 'provided', story: text }
  if (looksLikeNarrative(text)) return { recognized: true, source: 'narrative', story: text }
  if (assessConceptEntry(text).operationallyClear) return { recognized: true, source: 'operational', story: text }
  return { recognized: false, source: null, story: null }
}

// ── "What should happen" ──────────────────────────────────────────────────────────────
// The control phrase (MASTER glossary): the description of WHAT happens at the event and
// what people should experience — NOT timeline/resources/budget. Planning may only begin
// once a "what should happen" is recorded and approved. A bare concept selection is NOT
// enough on its own: it must be turned into a recorded "what should happen" here.

// Who the event centres on — used to make a draft request-specific, not generic.
function subjectOf(text: string): string {
  const t = (text || '').toLowerCase()
  if (/\bmy son\b|\bson\b/.test(t)) return 'your son'
  if (/\bmy daughter\b|\bdaughter\b/.test(t)) return 'your daughter'
  if (/\bmy (?:mother|mum|mom)\b|\bmother\b/.test(t)) return 'your mother'
  if (/\bmy (?:father|dad)\b|\bfather\b/.test(t)) return 'your father'
  if (/\bmy parents\b|\bparents\b/.test(t)) return 'your parents'
  if (/\bemployees\b|\bstaff\b|\bteam\b|\bcolleagues\b|\bcoworkers?\b/.test(t)) return 'your team'
  if (/\belderly\b|\bseniors?\b|retirement/.test(t)) return 'the elderly guests'
  if (/\bwealthy\b|\brich\b|\baffluent\b|\bvip\b/.test(t)) return 'your guests'
  if (/\bkids?\b|\bchildren\b/.test(t)) return 'the children'
  return 'your guests'
}

// The desired outcome in the user's own words — anchors the fallback so it is never generic.
function desireOf(text: string): string {
  return (text || '')
    .trim()
    .replace(/^\s*(?:i(?:'d)?\s+(?:want|would like|wish)|we\s+(?:want|would like|wish)|please)\b\s*/i, '')
    .replace(/[.\s]+$/, '')
    .trim() || 'the experience you described'
}

// Outcome families → a 3-part draft: what happens · what people experience · intended outcome.
// Each is request-specific (woven with the subject); ordered most-specific first.
const OUTCOME_DRAFTS: { test: RegExp; build: (subject: string) => string }[] = [
  {
    test: /\bremember\b|\bforever\b|never forget|unforgettable|memorable|lasting memory|symbolic|milestone|step toward/i,
    build: (s) => `What happens: ${s}'s celebration is built around one unforgettable, signature moment — a personal touch and a keepsake to look back on (for example, a message to their future self). What people experience: ${s} and the guests feel the day was made just for them and genuinely mattered. Intended outcome: it becomes a lasting memory ${s} remembers for years.`,
  },
  {
    test: /\bavoid(?:ing)?\b|distant|tension|reconnect|feel like (?:a |one )?team|one team|bond\b|get(?: to)? closer|stop .* each other/i,
    build: (s) => `What happens: ${s} spend relaxed, low-pressure time together — easing from work talk into real, personal conversation over shared food and activities. What people experience: comfort, warmth and small shared moments that quietly rebuild rapport. Intended outcome: ${s} gradually reconnect and leave feeling like one team again.`,
  },
  {
    test: /make .*friends|new friends|real friends|meet (?:new )?people|genuine (?:personal )?connection|make connections/i,
    build: (s) => `What happens: people meet in small, guided, low-pressure ways that make real conversation easy rather than forced. What people experience: genuine personal connection — being seen and actually getting to know others, not small talk. Intended outcome: real friendships form among ${s} — the kind that continue after the event.`,
  },
  {
    test: /princess|royal(?:ty)?|feel like a\b|treated like|\bvip\b|like a star|glamour/i,
    build: (s) => `What happens: ${s} is the celebrated centre of the day — dressed up, given the spotlight and treated like royalty, surrounded by admiring guests. What people experience: glamour, attention and delight, with ${s} as the undeniable star. Intended outcome: ${s} feels special, admired, celebrated and treated like royalty.`,
  },
  {
    test: /inspire(?:d|s)?|inspiring|motivat\w*|aspir\w*|\bmoved\b|new ideas|energi[sz]e/i,
    build: (s) => `What happens: a premium, carefully curated gathering where ${s} encounter ideas, stories and experiences designed to move them, in a setting that feels exclusive and elevated. What people experience: awe, energy and a sense of possibility. Intended outcome: ${s} leave inspired — with new ideas and the motivation to create something meaningful.`,
  },
]

/**
 * Deterministic "what should happen" DRAFT: a request-specific description of what happens,
 * what people experience, and the intended emotional/social outcome. NOT a concept label, and
 * distinct across unrelated requests (it weaves the subject + the recognised outcome, falling
 * back to the user's own words). This is the fallback for the AI draft (composeWhatShouldHappen).
 */
export function draftWhatShouldHappen(request: string): string {
  const text = (request || '').trim()
  if (!text) return ''
  const subject = subjectOf(text)
  for (const o of OUTCOME_DRAFTS) {
    if (o.test.test(text)) return o.build(subject)
  }
  const desire = desireOf(text)
  return `What happens: an event built around what you described — "${desire}". What people experience: the moments and atmosphere that make "${desire}" real for ${subject}. Intended outcome: ${subject} get exactly that — "${desire}".`
}

/**
 * Produce the "what should happen" for a request: the recognised story when one already
 * exists, otherwise a request-specific DRAFT (for the user to approve/edit). A selected
 * concept does NOT define it. Always non-null for non-empty requests (so the draft can be
 * shown); planning still requires the user to approve it (gate in generateFromIdeaAction).
 */
export function deriveWhatShouldHappen(request: string): string | null {
  const rec = recognizeScenario(request)
  if (rec.recognized && rec.story) return rec.story
  const draft = draftWhatShouldHappen(request)
  return draft || null
}
