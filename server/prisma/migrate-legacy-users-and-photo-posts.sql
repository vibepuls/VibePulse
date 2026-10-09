-- Optional, non-destructive copy from the legacy VibePulse schema into the new Prisma schema.
-- Run ONLY after `npm --prefix server run db:push` has created the new "social_gaming"."User" and "social_gaming"."Post" tables.
-- This script copies compatible records and never deletes or updates the legacy tables.
-- Existing legacy point_accounts.balance is preserved when that table exists.
-- Any username/email conflicts are skipped rather than overwriting existing new-schema records.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    IF to_regclass('public.point_accounts') IS NOT NULL THEN
      EXECUTE $copy_users_with_points$
        INSERT INTO "social_gaming"."User" ("id", "username", "displayName", "email", "passwordHash", "bio", "avatarUrl", "points", "role", "status", "createdAt")
        SELECT
          u.id::text,
          lower(u.username),
          COALESCE(NULLIF(u.full_name, ''), u.username),
          NULLIF(u.email, ''),
          u.password_hash,
          COALESCE(u.bio, ''),
          NULLIF(u.profile_picture, ''),
          LEAST(GREATEST(COALESCE(pa.balance, 100), 0), 2147483647)::integer,
          CASE WHEN lower(COALESCE(u.role, 'user')) IN ('admin', 'super_admin') THEN 'ADMIN' ELSE 'USER' END,
          CASE
            WHEN COALESCE(u.is_suspended, false) THEN 'SUSPENDED'
            WHEN NOT COALESCE(u.is_active, true) THEN 'BANNED'
            ELSE 'ACTIVE'
          END,
          COALESCE(u.created_at, now())
        FROM public.users u
        LEFT JOIN public.point_accounts pa ON pa.user_id = u.id
        WHERE u.deleted_at IS NULL
        ON CONFLICT DO NOTHING
      $copy_users_with_points$;
    ELSE
      INSERT INTO "social_gaming"."User" ("id", "username", "displayName", "email", "passwordHash", "bio", "avatarUrl", "points", "role", "status", "createdAt")
      SELECT
        u.id::text,
        lower(u.username),
        COALESCE(NULLIF(u.full_name, ''), u.username),
        NULLIF(u.email, ''),
        u.password_hash,
        COALESCE(u.bio, ''),
        NULLIF(u.profile_picture, ''),
        100,
        CASE WHEN lower(COALESCE(u.role, 'user')) IN ('admin', 'super_admin') THEN 'ADMIN' ELSE 'USER' END,
        CASE
          WHEN COALESCE(u.is_suspended, false) THEN 'SUSPENDED'
          WHEN NOT COALESCE(u.is_active, true) THEN 'BANNED'
          ELSE 'ACTIVE'
        END,
        COALESCE(u.created_at, now())
      FROM public.users u
      WHERE u.deleted_at IS NULL
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    RAISE NOTICE 'Legacy public.users table not found; skipping user copy.';
  END IF;

  IF to_regclass('public.posts') IS NOT NULL AND to_regclass('public.post_media') IS NOT NULL THEN
    INSERT INTO "social_gaming"."Post" ("id", "authorId", "imageUrl", "caption", "points", "hidden", "createdAt")
    SELECT DISTINCT ON (p.id)
      p.id::text,
      u.id,
      pm.media_url,
      COALESCE(p.content, ''),
      0,
      COALESCE(p.is_deleted, false),
      COALESCE(p.created_at, now())
    FROM public.posts p
    JOIN public.post_media pm ON pm.post_id = p.id AND pm.media_type = 'image'
    JOIN "social_gaming"."User" u ON u.id = p.user_id::text
    WHERE COALESCE(p.is_deleted, false) = false
      AND NULLIF(pm.media_url, '') IS NOT NULL
    ORDER BY p.id, pm.order_index ASC
    ON CONFLICT ("id") DO NOTHING;
  ELSE
    RAISE NOTICE 'Legacy public.posts/post_media tables not found; skipping photo post copy.';
  END IF;
END $$;

COMMIT;
