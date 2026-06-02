-- ============================================================
-- 016_marketplace_categories.sql — Phase 9: emotional category taxonomy
-- Depends on: 007 (activity_category enum)
-- ============================================================
--
-- Extends activity_category with scenario/occasion-based values across three
-- discovery layers (Personal & Family, Communities & Groups, Premium & Niche).
-- Additive only — the original generic values are kept so existing activities
-- and requests keep working. Must be applied BEFORE the Phase 9 seed (which
-- inserts activities using these values) and before deploying the frontend that
-- offers them in the create forms.
-- ============================================================

-- A — Personal & Family Events
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'birthday';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'kids_party';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'wedding';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'anniversary';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'baby_shower';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'reunion';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'graduation';

-- B — Community & Identity Gatherings
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'hiking_club';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'language_meetup';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'cultural_community';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'faith_community';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'hobby_group';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'alumni';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'fan_community';

-- C — Premium / Extreme / Niche Experiences
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'luxury_picnic';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'sunset_yacht';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'private_chef';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'glamping';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'volcano_dinner';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'survival_camp';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'underwater_photography';
