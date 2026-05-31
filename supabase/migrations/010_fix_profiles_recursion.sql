-- ============================================================
-- 010_fix_profiles_recursion.sql — Fix RLS infinite recursion on profiles
-- Depends on: 001_profiles.sql (profiles), 003_academy.sql (is_admin)
-- ============================================================
--
-- ROOT CAUSE
-- The admin policies created in 001 test admin status with a self-referential
-- subquery directly on profiles:
--     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
-- That subquery is itself subject to profiles' SELECT policies. For an
-- AUTHENTICATED user the "owner" policy (auth.uid() = id) satisfies the inner
-- row and short-circuits, so no recursion occurs — which is why this was latent
-- through Phases 1–4. But when auth.uid() IS NULL (anonymous access), the owner
-- policy never holds, so evaluating the admin policy re-enters the admin policy
-- unboundedly:
--     ERROR 42P17: infinite recursion detected in policy for relation "profiles"
--
-- FIX
-- Replace the self-referential admin policies with the is_admin() SECURITY
-- DEFINER helper (added in 003). is_admin() runs as the table owner and
-- therefore bypasses RLS, so it cannot recurse. This is the same mechanism
-- already used safely by organizer_profiles / activities / venues / etc.
--
-- Security is unchanged: admins still read/update every profile; owners still
-- read/update only their own (with the existing self-escalation guard); anon
-- and other users still see nothing.
-- ============================================================

-- Drop the recursive admin policies (covers both the numbered-migration names
-- and the legacy combined-migration name, defensively).
DROP POLICY IF EXISTS "profiles_select_admin"        ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin"        ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Recreate using the non-recursive SECURITY DEFINER helper.
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  USING (is_admin());
