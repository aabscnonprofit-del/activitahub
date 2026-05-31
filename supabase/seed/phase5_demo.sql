-- ============================================================
-- phase5_demo.sql — DEVELOPMENT seed for Phase 5 visibility/QA
-- Run AFTER all migrations (001–010) in the Supabase SQL editor.
-- Idempotent (fixed UUIDs + ON CONFLICT DO NOTHING). NOT for production.
-- ============================================================
--
-- Creates loginable demo accounts and real rows so the whole Phase 5 surface
-- is visible locally:
--   * 2 certified, subscribed organizers (+ published organizer profiles)
--   * venues + published activities with full marketplace fields
--   * 1 customer with a request, matched organizers, proposals, a booking
--   * notifications
--
-- DEMO LOGINS (email / password):
--   maria.demo@activita.test     / ActivitaDemo123!   (organizer)
--   dmitri.demo@activita.test    / ActivitaDemo123!   (organizer)
--   customer.demo@activita.test  / ActivitaDemo123!   (customer)
-- ============================================================

-- ── Demo auth users (email/password, pre-confirmed) ──────────────────────────
-- The handle_new_user trigger creates the matching profiles rows automatically.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'd1d1d1d1-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'maria.demo@activita.test',
   crypt('ActivitaDemo123!', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Maria Demo"}',
   NOW(), NOW(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd1d1d1d1-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'dmitri.demo@activita.test',
   crypt('ActivitaDemo123!', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Dmitri Demo"}',
   NOW(), NOW(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd1d1d1d1-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'customer.demo@activita.test',
   crypt('ActivitaDemo123!', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Casey Customer"}',
   NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Email-provider identities (required by current GoTrue for password login).
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'd1d1d1d1-0000-4000-8000-000000000001',
   '{"sub":"d1d1d1d1-0000-4000-8000-000000000001","email":"maria.demo@activita.test"}', 'email',
   'd1d1d1d1-0000-4000-8000-000000000001', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'd1d1d1d1-0000-4000-8000-000000000002',
   '{"sub":"d1d1d1d1-0000-4000-8000-000000000002","email":"dmitri.demo@activita.test"}', 'email',
   'd1d1d1d1-0000-4000-8000-000000000002', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'd1d1d1d1-0000-4000-8000-000000000003',
   '{"sub":"d1d1d1d1-0000-4000-8000-000000000003","email":"customer.demo@activita.test"}', 'email',
   'd1d1d1d1-0000-4000-8000-000000000003', NOW(), NOW(), NOW())
ON CONFLICT (provider, provider_id) DO NOTHING;

-- ── Promote organizers; ensure customer profile ─────────────────────────────
UPDATE profiles SET role = 'certified_organizer', onboarding_status = 'subscribed',
       selected_path = 'experienced', full_name = COALESCE(full_name, 'Maria Demo')
  WHERE id = 'd1d1d1d1-0000-4000-8000-000000000001';
UPDATE profiles SET role = 'certified_organizer', onboarding_status = 'subscribed',
       selected_path = 'beginner', full_name = COALESCE(full_name, 'Dmitri Demo')
  WHERE id = 'd1d1d1d1-0000-4000-8000-000000000002';
UPDATE profiles SET full_name = COALESCE(full_name, 'Casey Customer')
  WHERE id = 'd1d1d1d1-0000-4000-8000-000000000003';

-- ── Active subscriptions (so organizers can reach the dashboard) ─────────────
INSERT INTO subscriptions (profile_id, status, current_period_end, cancel_at_period_end)
VALUES
  ('d1d1d1d1-0000-4000-8000-000000000001', 'active', NOW() + INTERVAL '30 days', FALSE),
  ('d1d1d1d1-0000-4000-8000-000000000002', 'active', NOW() + INTERVAL '30 days', FALSE)
ON CONFLICT (profile_id) DO NOTHING;

-- ── Published organizer profiles (public) ────────────────────────────────────
INSERT INTO organizer_profiles (user_id, display_name, bio, city, country, languages, website, status)
VALUES
  ('d1d1d1d1-0000-4000-8000-000000000001', 'Maria''s Adventures',
   'Certified outdoor and wellness organizer running small-group experiences across Barcelona.',
   'Barcelona', 'Spain', ARRAY['English','Spanish'], 'https://example.com/maria', 'published'),
  ('d1d1d1d1-0000-4000-8000-000000000002', 'Dmitri Workshops',
   'Hands-on arts, music, and education workshops for kids and families in Berlin.',
   'Berlin', 'Germany', ARRAY['English','Russian'], 'https://example.com/dmitri', 'published')
ON CONFLICT (user_id) DO NOTHING;

-- ── Certificates (drives the "certified" badge) ──────────────────────────────
-- Self-contained: ensure the referenced course exists even without the academy seed.
INSERT INTO courses (id, slug, path, title, description, sort_order, published) VALUES
  ('c0c0c0c0-0000-4000-8000-000000000001', 'foundations', 'beginner',
   'Activita Certified Organizer — Foundations', 'Foundations course.', 1, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO certificates (id, profile_id, course_id, certificate_code, score, issued_at) VALUES
  ('d7000000-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000001',
   'c0c0c0c0-0000-4000-8000-000000000001', 'AH-DEMOMARIA01', 92, NOW() - INTERVAL '20 days'),
  ('d7000000-0000-4000-8000-000000000002', 'd1d1d1d1-0000-4000-8000-000000000002',
   'c0c0c0c0-0000-4000-8000-000000000001', 'AH-DEMODMITRI1', 88, NOW() - INTERVAL '40 days')
ON CONFLICT (id) DO NOTHING;

-- ── Venues ───────────────────────────────────────────────────────────────────
INSERT INTO venues (id, organizer_id, name, address, city, country, capacity, indoor_outdoor, notes) VALUES
  ('d2000000-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000001',
   'Parc de Montjuïc Meeting Point', 'Av. de Miramar', 'Barcelona', 'Spain', 20, 'outdoor', 'Meet by the cable car.'),
  ('d2000000-0000-4000-8000-000000000002', 'd1d1d1d1-0000-4000-8000-000000000002',
   'Kreuzberg Studio', 'Oranienstraße 10', 'Berlin', 'Germany', 15, 'indoor', 'Buzzer 3.')
ON CONFLICT (id) DO NOTHING;

-- ── Published activities (full marketplace fields) ───────────────────────────
INSERT INTO activities (id, organizer_id, title, description, status, category, price_cents, currency,
                        languages, min_age, max_age, city, country, indoor_outdoor, venue_id, duration_minutes) VALUES
  ('d3000000-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000001',
   'Sunrise Hike & Mindfulness', 'A gentle guided hike up Montjuïc followed by a short mindfulness session with city views.',
   'published', 'outdoor', 3500, 'eur', ARRAY['English','Spanish'], 12, 99, 'Barcelona', 'Spain', 'outdoor',
   'd2000000-0000-4000-8000-000000000001', 120),
  ('d3000000-0000-4000-8000-000000000002', 'd1d1d1d1-0000-4000-8000-000000000001',
   'Family Beach Yoga', 'Relaxed yoga on the beach designed for parents and kids together.',
   'published', 'wellness', 2000, 'eur', ARRAY['English','Spanish'], 6, 99, 'Barcelona', 'Spain', 'outdoor',
   'd2000000-0000-4000-8000-000000000001', 60),
  ('d3000000-0000-4000-8000-000000000003', 'd1d1d1d1-0000-4000-8000-000000000001',
   'Tapas Cooking Basics', 'Learn to cook three classic tapas in a hands-on small-group class.',
   'published', 'food', 5500, 'eur', ARRAY['English','Spanish'], 16, 99, 'Barcelona', 'Spain', 'indoor',
   NULL, 150),
  ('d3000000-0000-4000-8000-000000000004', 'd1d1d1d1-0000-4000-8000-000000000002',
   'Kids Music Discovery', 'A playful introduction to rhythm and instruments for young children.',
   'published', 'music', 1800, 'eur', ARRAY['English','Russian'], 3, 8, 'Berlin', 'Germany', 'indoor',
   'd2000000-0000-4000-8000-000000000002', 45),
  ('d3000000-0000-4000-8000-000000000005', 'd1d1d1d1-0000-4000-8000-000000000002',
   'Watercolor Workshop', 'Create your first watercolor landscape — all materials included.',
   'published', 'arts', 4000, 'eur', ARRAY['English'], 10, 99, 'Berlin', 'Germany', 'indoor',
   'd2000000-0000-4000-8000-000000000002', 120),
  ('d3000000-0000-4000-8000-000000000006', 'd1d1d1d1-0000-4000-8000-000000000002',
   'STEM Robotics for Teens', 'Build and program a simple robot in a guided session.',
   'published', 'education', 6000, 'eur', ARRAY['English','Russian'], 11, 16, 'Berlin', 'Germany', 'indoor',
   'd2000000-0000-4000-8000-000000000002', 180)
ON CONFLICT (id) DO NOTHING;

-- A couple of upcoming sessions (calendar) so the date filter + detail page show availability.
INSERT INTO calendar_events (id, organizer_id, title, event_type, activity_id, venue_id, date, start_time) VALUES
  ('d8000000-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000001',
   'Sunrise Hike session', 'session', 'd3000000-0000-4000-8000-000000000001',
   'd2000000-0000-4000-8000-000000000001', CURRENT_DATE + INTERVAL '7 days', '07:00'),
  ('d8000000-0000-4000-8000-000000000002', 'd1d1d1d1-0000-4000-8000-000000000002',
   'Watercolor session', 'session', 'd3000000-0000-4000-8000-000000000005',
   'd2000000-0000-4000-8000-000000000002', CURRENT_DATE + INTERVAL '5 days', '15:00')
ON CONFLICT (id) DO NOTHING;

-- ── Customer request + matches + proposals + booking ─────────────────────────
INSERT INTO customer_requests (id, customer_id, event_type, city, country, desired_date,
                               participant_count, age_min, age_max, budget_cents, currency, notes, status) VALUES
  ('d4000000-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000003',
   'arts', 'Berlin', 'Germany', CURRENT_DATE + INTERVAL '14 days', 8, 8, 12, 30000, 'eur',
   'Birthday party for my daughter — looking for a creative arts activity.', 'matched')
ON CONFLICT (id) DO NOTHING;

INSERT INTO request_matches (id, request_id, organizer_id) VALUES
  ('d9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000002')
ON CONFLICT (request_id, organizer_id) DO NOTHING;

INSERT INTO proposals (id, request_id, organizer_id, activity_id, message, price_cents, currency, proposed_date, status) VALUES
  ('d5000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001',
   'd1d1d1d1-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000005',
   'I can run a private watercolor workshop for 8 kids — includes all materials.', 28000, 'eur',
   CURRENT_DATE + INTERVAL '14 days', 'sent')
ON CONFLICT (request_id, organizer_id) DO NOTHING;

-- A second request already booked (shows the booking surface).
INSERT INTO customer_requests (id, customer_id, event_type, city, country, desired_date,
                               participant_count, budget_cents, currency, notes, status) VALUES
  ('d4000000-0000-4000-8000-000000000002', 'd1d1d1d1-0000-4000-8000-000000000003',
   'outdoor', 'Barcelona', 'Spain', CURRENT_DATE + INTERVAL '10 days', 4, 20000, 'eur',
   'Family hike for a weekend visit.', 'booked')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings (id, customer_id, organizer_id, activity_id, request_id, venue_id, date,
                      participant_count, amount_cents, currency, status) VALUES
  ('d6000000-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000003',
   'd1d1d1d1-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001',
   'd4000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001',
   CURRENT_DATE + INTERVAL '10 days', 4, 14000, 'eur', 'confirmed')
ON CONFLICT (id) DO NOTHING;

-- ── Notifications (foundation) ───────────────────────────────────────────────
INSERT INTO notifications (id, profile_id, type, title, body, data, read_at) VALUES
  ('da000000-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000002',
   'request_match', 'New request matched', 'A customer is looking for arts in Berlin.',
   '{"request_id":"d4000000-0000-4000-8000-000000000001"}', NULL),
  ('da000000-0000-4000-8000-000000000002', 'd1d1d1d1-0000-4000-8000-000000000003',
   'proposal_received', 'New proposal received', 'An organizer sent you a proposal.',
   '{"request_id":"d4000000-0000-4000-8000-000000000001"}', NULL),
  ('da000000-0000-4000-8000-000000000003', 'd1d1d1d1-0000-4000-8000-000000000001',
   'booking_created', 'New booking', 'You have a new confirmed booking.',
   '{"booking_id":"d6000000-0000-4000-8000-000000000001"}', NOW())
ON CONFLICT (id) DO NOTHING;
