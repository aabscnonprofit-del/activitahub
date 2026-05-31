-- ============================================================
-- academy_content.sql — Phase 3A seed: realistic course content
-- Run AFTER 003_academy.sql, in the Supabase SQL editor.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING, safe to re-run.
-- ============================================================

-- ─── Courses ─────────────────────────────────────────────────────────────────
INSERT INTO courses (id, slug, path, title, description, sort_order, published) VALUES
  ('c0c0c0c0-0000-4000-8000-000000000001', 'foundations', 'beginner',
   'Activita Certified Organizer — Foundations',
   'Everything a new organizer needs: planning safe, engaging activities, running them on the Activita platform, and delighting clients.',
   1, TRUE),
  ('c0c0c0c0-0000-4000-8000-000000000002', 'fast-track', 'experienced',
   'Activita Certified Organizer — Fast Track',
   'A condensed path for experienced organizers: platform standards, compliance, and scaling your activity business.',
   2, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─── Modules (beginner) ──────────────────────────────────────────────────────
INSERT INTO modules (id, course_id, title, description, sort_order) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'c0c0c0c0-0000-4000-8000-000000000001',
   'Getting Started as an Activity Organizer',
   'Understand the role and set up your presence on Activita.', 1),
  ('b0000000-0000-4000-8000-000000000002', 'c0c0c0c0-0000-4000-8000-000000000001',
   'Planning Safe & Engaging Activities',
   'Design activities people love while keeping everyone safe.', 2),
  ('b0000000-0000-4000-8000-000000000003', 'c0c0c0c0-0000-4000-8000-000000000001',
   'Working with Clients',
   'Communicate, schedule, and handle the realities of bookings.', 3)
ON CONFLICT (id) DO NOTHING;

-- ─── Modules (experienced) ───────────────────────────────────────────────────
INSERT INTO modules (id, course_id, title, description, sort_order) VALUES
  ('b0000000-0000-4000-8000-000000000004', 'c0c0c0c0-0000-4000-8000-000000000002',
   'Platform & Standards',
   'The Activita standards you are expected to uphold.', 1),
  ('b0000000-0000-4000-8000-000000000005', 'c0c0c0c0-0000-4000-8000-000000000002',
   'Advanced Operations',
   'Scale your operation and make decisions with data.', 2)
ON CONFLICT (id) DO NOTHING;

-- ─── Lessons (beginner / Module 1) ───────────────────────────────────────────
INSERT INTO lessons (id, module_id, slug, title, content, sort_order, duration_minutes) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'what-is-an-organizer', 'What Is an Activity Organizer?',
   'An activity organizer designs, schedules, and runs experiences — from a weekend hiking trip to a weekly pottery class. On Activita you are responsible for the full lifecycle: planning the activity, listing it, confirming bookings, and making sure participants have a safe, memorable time.

Great organizers share three habits: they prepare thoroughly, they communicate clearly, and they follow up. Throughout this course you will build each of these habits with concrete checklists you can reuse for every activity you run.',
   1, 6),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
   'platform-overview', 'The Activita Platform Overview',
   'Activita gives you a dashboard to manage activities, venues, clients, and a calendar in one place. Your dashboard becomes available once you are certified and subscribed.

The key objects you will work with are: Activities (what you offer), Venues (where they happen), Clients (the people who book), and Calendar Events (when things occur). Keeping these accurate is what makes scheduling and communication effortless later.',
   2, 5),
  ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001',
   'set-up-profile', 'Setting Up Your Organizer Profile',
   'Your organizer profile is the first thing a prospective client sees. A complete profile — display name, a clear bio, your city and languages — builds trust before anyone messages you.

Write your bio in plain language: who you are, what you run, and why people enjoy it. List the languages you can host in; Activita serves a multilingual community across English, Spanish, French, and Russian.',
   3, 5)
ON CONFLICT (id) DO NOTHING;

-- ─── Lessons (beginner / Module 2) ───────────────────────────────────────────
INSERT INTO lessons (id, module_id, slug, title, content, sort_order, duration_minutes) VALUES
  ('a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002',
   'activity-design', 'Activity Design Principles',
   'A well-designed activity has a clear arc: a welcoming start, a satisfying core experience, and a calm wind-down. Decide the single outcome a participant should leave with, then cut anything that does not serve it.

Match difficulty to your audience and always have a plan B for weather, no-shows, or a venue change. Over-preparing the first few times is normal and pays off.',
   1, 7),
  ('a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002',
   'risk-assessment', 'Risk Assessment Basics',
   'Before every activity, walk through a simple risk assessment: list what could go wrong, how likely it is, how serious it would be, and what you will do to prevent or respond to it.

Keep an incident plan: know the nearest exit and first-aid kit, have emergency contacts on hand, and brief participants on safety at the start. A two-minute safety briefing prevents the majority of avoidable problems.',
   2, 8),
  ('a0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002',
   'choosing-a-venue', 'Choosing the Right Venue',
   'The right venue fits your group size, is reachable by your participants, and suits the activity (indoor, outdoor, or both). Visit in advance when you can, and note capacity, accessibility, parking, and restrooms.

Record each venue in your Venues list with its capacity and notes so you can reuse the best ones and avoid the ones that did not work.',
   3, 6)
ON CONFLICT (id) DO NOTHING;

-- ─── Lessons (beginner / Module 3) ───────────────────────────────────────────
INSERT INTO lessons (id, module_id, slug, title, content, sort_order, duration_minutes) VALUES
  ('a0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000003',
   'communicating', 'Communicating with Clients',
   'Clear communication prevents most problems. Confirm the essentials in writing: date, time, location, what to bring, and how to reach you. Send a friendly reminder the day before.

Set expectations about your cancellation and refund policy up front, so there are no surprises if plans change.',
   1, 5),
  ('a0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000003',
   'booking-scheduling', 'Booking and Scheduling',
   'Use your calendar as the single source of truth. Block out the activity, add buffer time for setup and cleanup, and avoid double-booking a venue.

When you confirm a booking, immediately add the client and the event so nothing lives only in your head.',
   2, 5),
  ('a0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000003',
   'handling-cancellations', 'Handling Cancellations',
   'Cancellations happen. A clear, fair policy — communicated before booking — keeps them low-stress. Decide your notice window and any partial-refund rules, and apply them consistently.

When you must cancel, tell participants as early as possible, apologize, and offer a reschedule. Reliability is the foundation of your reputation.',
   3, 5)
ON CONFLICT (id) DO NOTHING;

-- ─── Lessons (experienced / fast track) ──────────────────────────────────────
INSERT INTO lessons (id, module_id, slug, title, content, sort_order, duration_minutes) VALUES
  ('a0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000004',
   'standards-overview', 'Activita Standards Overview',
   'As a certified organizer you uphold the Activita standards: safety first, honest listings, respectful communication, and reliable scheduling. These are the commitments clients trust when they see your certified badge.

This fast-track assumes you already run activities; the goal is to align your existing practice with the platform standards.',
   1, 6),
  ('a0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000004',
   'compliance-essentials', 'Compliance Essentials',
   'Know the basics that keep you and your participants protected: appropriate insurance for your activity type, any local permits, and clear consent for minors where relevant.

Document your processes. If something goes wrong, a written record of your safety briefing and risk assessment protects everyone.',
   2, 7),
  ('a0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000005',
   'scaling', 'Scaling Your Activity Business',
   'Scaling means doing more without dropping quality. Standardize what works: reusable activity templates, a fixed pre-activity checklist, and saved venues. Delegate setup tasks before you delegate the experience itself.

Grow your calendar deliberately — add recurring slots only once the previous ones run smoothly.',
   1, 7),
  ('a0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000005',
   'analytics-optimization', 'Analytics & Optimization',
   'Use your dashboard analytics to see which activities fill up, which times work, and where cancellations cluster. Let the data, not guesswork, guide your schedule.

Review monthly: double down on what sells out, adjust or retire what does not, and test one change at a time so you know what moved the needle.',
   2, 6)
ON CONFLICT (id) DO NOTHING;

-- ─── Sample quiz (structure only; admin-readable answer key) ──────────────────
-- Attached to "Risk Assessment Basics". Phase 3B turns these into a graded exam.
INSERT INTO quizzes (id, lesson_id, title, description, passing_score) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005',
   'Risk Assessment Check', 'A short knowledge check on activity risk assessment.', 70)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_questions (id, quiz_id, prompt, type, sort_order) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
   'What should a basic risk assessment identify?', 'single_choice', 1),
  ('f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001',
   'A safety briefing should be given before the activity starts.', 'true_false', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_options (id, question_id, label, is_correct, sort_order) VALUES
  ('e1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
   'What could go wrong, how likely, how serious, and how to respond', TRUE, 1),
  ('e1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001',
   'Only the total number of participants', FALSE, 2),
  ('e1000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001',
   'The organizer''s favourite colour', FALSE, 3),
  ('e1000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000002',
   'True', TRUE, 1),
  ('e1000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000002',
   'False', FALSE, 2)
ON CONFLICT (id) DO NOTHING;
