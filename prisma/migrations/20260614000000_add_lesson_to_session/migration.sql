-- This migration was superseded: lessonId was added then removed in the same session.
-- The column was never on production. No-op on fresh deploys.
SELECT 1;
