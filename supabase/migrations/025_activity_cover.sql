-- ============================================================
-- 025_activity_cover.sql — Activity Cover Images MVP
--
-- Lets an organizer attach ONE cover image to an activity so marketplace cards
-- and the activity detail page show a real image instead of the category
-- fallback banner.
--
-- Storage: REUSES the existing public `venue-photos` bucket (006). That bucket's
-- policies already allow owner writes under "<uid>/..." and public reads of every
-- object, so activity covers stored at "<uid>/activity-covers/<activity_id>/..."
-- need NO new bucket or storage policy.
--
-- Display: published activities are directly world-readable
-- (activities_select USING ... OR status='published'), so the app's marketplace
-- query layer prefers activities.cover_path over the venue photo without changing
-- any SECURITY DEFINER RPC.
--
-- Depends on: 006 (activities, venue-photos bucket), 007 (marketplace columns).
-- ============================================================

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS cover_path TEXT;

COMMENT ON COLUMN activities.cover_path IS
  'Storage path (in the venue-photos bucket) of the activity''s own cover image. NULL = fall back to the venue photo, then the category visual.';
