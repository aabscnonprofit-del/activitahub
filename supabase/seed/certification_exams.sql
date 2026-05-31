-- ============================================================
-- certification_exams.sql — Phase 3B seed: final exams
-- Run AFTER 005_certification.sql and academy_content.sql.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING.
-- ============================================================

-- ─── Final exam: Foundations (beginner) ──────────────────────────────────────
INSERT INTO quizzes (id, lesson_id, course_id, kind, title, description, passing_score) VALUES
  ('d0000000-0000-4000-8000-0000000000a1', NULL,
   'c0c0c0c0-0000-4000-8000-000000000001', 'final_exam',
   'Foundations — Certification Exam',
   'Pass with 70% or higher to earn your Activita Certified Organizer certificate.', 70)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_questions (id, quiz_id, prompt, type, sort_order) VALUES
  ('f0000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-0000000000a1',
   'Which three habits do great organizers share?', 'single_choice', 1),
  ('f0000000-0000-4000-8000-0000000000a2', 'd0000000-0000-4000-8000-0000000000a1',
   'What should you do before every activity?', 'single_choice', 2),
  ('f0000000-0000-4000-8000-0000000000a3', 'd0000000-0000-4000-8000-0000000000a1',
   'You should confirm date, time, and location with clients in writing.', 'true_false', 3),
  ('f0000000-0000-4000-8000-0000000000a4', 'd0000000-0000-4000-8000-0000000000a1',
   'A good venue should…', 'single_choice', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_options (id, question_id, label, is_correct, sort_order) VALUES
  -- Q1
  ('e1000000-0000-4000-8000-0000000000a1', 'f0000000-0000-4000-8000-0000000000a1',
   'Prepare thoroughly, communicate clearly, and follow up', TRUE, 1),
  ('e1000000-0000-4000-8000-0000000000a2', 'f0000000-0000-4000-8000-0000000000a1',
   'Improvise, stay quiet, and hope for the best', FALSE, 2),
  ('e1000000-0000-4000-8000-0000000000a3', 'f0000000-0000-4000-8000-0000000000a1',
   'Overbook, upsell, and never refund', FALSE, 3),
  -- Q2
  ('e1000000-0000-4000-8000-0000000000a4', 'f0000000-0000-4000-8000-0000000000a2',
   'Run a simple risk assessment and brief participants on safety', TRUE, 1),
  ('e1000000-0000-4000-8000-0000000000a5', 'f0000000-0000-4000-8000-0000000000a2',
   'Nothing — preparation is optional', FALSE, 2),
  ('e1000000-0000-4000-8000-0000000000a6', 'f0000000-0000-4000-8000-0000000000a2',
   'Cancel if fewer than ten people sign up', FALSE, 3),
  -- Q3 (true/false)
  ('e1000000-0000-4000-8000-0000000000a7', 'f0000000-0000-4000-8000-0000000000a3',
   'True', TRUE, 1),
  ('e1000000-0000-4000-8000-0000000000a8', 'f0000000-0000-4000-8000-0000000000a3',
   'False', FALSE, 2),
  -- Q4
  ('e1000000-0000-4000-8000-0000000000a9', 'f0000000-0000-4000-8000-0000000000a4',
   'Fit your group size, be reachable, and suit the activity', TRUE, 1),
  ('e1000000-0000-4000-8000-0000000000aa', 'f0000000-0000-4000-8000-0000000000a4',
   'Be the cheapest option regardless of fit', FALSE, 2),
  ('e1000000-0000-4000-8000-0000000000ab', 'f0000000-0000-4000-8000-0000000000a4',
   'Always be outdoors', FALSE, 3)
ON CONFLICT (id) DO NOTHING;

-- ─── Final exam: Fast Track (experienced) ────────────────────────────────────
INSERT INTO quizzes (id, lesson_id, course_id, kind, title, description, passing_score) VALUES
  ('d0000000-0000-4000-8000-0000000000b1', NULL,
   'c0c0c0c0-0000-4000-8000-000000000002', 'final_exam',
   'Fast Track — Certification Exam',
   'Pass with 70% or higher to earn your Activita Certified Organizer certificate.', 70)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_questions (id, quiz_id, prompt, type, sort_order) VALUES
  ('f0000000-0000-4000-8000-0000000000b1', 'd0000000-0000-4000-8000-0000000000b1',
   'Which set best describes the Activita standards?', 'single_choice', 1),
  ('f0000000-0000-4000-8000-0000000000b2', 'd0000000-0000-4000-8000-0000000000b1',
   'Documenting your safety processes protects you and your participants.', 'true_false', 2),
  ('f0000000-0000-4000-8000-0000000000b3', 'd0000000-0000-4000-8000-0000000000b1',
   'What does scaling your activity business mean?', 'single_choice', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_options (id, question_id, label, is_correct, sort_order) VALUES
  -- Q1
  ('e1000000-0000-4000-8000-0000000000b1', 'f0000000-0000-4000-8000-0000000000b1',
   'Safety first, honest listings, respectful communication, reliable scheduling', TRUE, 1),
  ('e1000000-0000-4000-8000-0000000000b2', 'f0000000-0000-4000-8000-0000000000b1',
   'Lowest price, most bookings, fastest replies', FALSE, 2),
  ('e1000000-0000-4000-8000-0000000000b3', 'f0000000-0000-4000-8000-0000000000b1',
   'Whatever the organizer prefers that day', FALSE, 3),
  -- Q2 (true/false)
  ('e1000000-0000-4000-8000-0000000000b4', 'f0000000-0000-4000-8000-0000000000b2',
   'True', TRUE, 1),
  ('e1000000-0000-4000-8000-0000000000b5', 'f0000000-0000-4000-8000-0000000000b2',
   'False', FALSE, 2),
  -- Q3
  ('e1000000-0000-4000-8000-0000000000b6', 'f0000000-0000-4000-8000-0000000000b3',
   'Doing more without dropping quality — standardize, then grow deliberately', TRUE, 1),
  ('e1000000-0000-4000-8000-0000000000b7', 'f0000000-0000-4000-8000-0000000000b3',
   'Accepting every booking immediately at any cost', FALSE, 2),
  ('e1000000-0000-4000-8000-0000000000b8', 'f0000000-0000-4000-8000-0000000000b3',
   'Never changing anything about your activities', FALSE, 3)
ON CONFLICT (id) DO NOTHING;
