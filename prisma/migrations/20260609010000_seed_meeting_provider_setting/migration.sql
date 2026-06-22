-- Seed default meeting provider setting (zoom = default, public so frontend can read it)
INSERT INTO "Setting" (key, value, "isPublic", "updatedAt")
VALUES ('meeting_provider', 'zoom', true, NOW())
ON CONFLICT (key) DO NOTHING;
