const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const BOT_PASSWORD = 'VibeBot@2026';

const bots = [
  ['VibePulse News', 'vibepulse_news', 'News and daily updates'],
  ['Tech Daily Bot', 'tech_daily_bot', 'Technology and AI updates'],
  ['Entertainment Hub', 'entertainment_hub', 'Movies and entertainment'],
  ['Sports Arena', 'sports_arena', 'Sports news and discussions'],
  ['Daily Facts', 'daily_facts', 'Interesting facts every day'],
  ['World Update', 'world_update', 'World news and global updates'],
  ['Bangla Buzz', 'bangla_buzz', 'Bangla culture and trends'],
  ['Food Explorer', 'food_explorer', 'Food and recipes'],
  ['Travel Guide', 'travel_guide', 'Travel tips and places'],
  ['Science Today', 'science_today', 'Science and discoveries'],
  ['Gaming Zone', 'gaming_zone', 'Gaming news and tips'],
  ['Movie Review Bot', 'movie_review_bot', 'Movie reviews'],
  ['Music Vibes', 'music_vibes', 'Music and songs'],
  ['Book Corner', 'book_corner', 'Books and reading'],
  ['Health Life', 'health_life', 'Lifestyle updates'],
  ['Photo World', 'photo_world', 'Photography'],
  ['History Vault', 'history_vault', 'History and stories'],
  ['Nature Watch', 'nature_watch', 'Nature and wildlife'],
  ['Auto World', 'auto_world', 'Cars and bikes'],
  ['Business Pulse', 'business_pulse', 'Business and startups'],
  ['Study Helper', 'study_helper', 'Study tips'],
  ['Career Guide', 'career_guide', 'Career and skills'],
  ['Fashion Daily', 'fashion_daily', 'Fashion and style'],
  ['Meme Station', 'meme_station', 'Memes and internet culture'],
  ['Weather Watch', 'weather_watch', 'Weather updates'],
  ['Space Explorer', 'space_explorer', 'Space and astronomy'],
  ['AI Assistant Bot', 'ai_assistant_bot', 'AI and automation'],
  ['Local Discoveries', 'local_discoveries', 'Interesting discoveries'],
  ['Trend Radar', 'trend_radar', 'Trending topics'],
  ['VibePulse Community', 'vibepulse_community', 'Community updates']
];

const postTexts = [
  'Welcome to VibePulse! What is everyone talking about today?',
  'Here is something interesting for the VibePulse community. What do you think?',
  'New day, new ideas. Share your thoughts with everyone!'
];

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(BOT_PASSWORD, 10);
    const users = [];

    for (const [fullName, username, bio] of bots) {
      const email = `${username}@bots.vibepulse.local`;

      const avatar =
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`;

      const result = await client.query(
        `INSERT INTO users
          (
            email,
            username,
            password_hash,
            full_name,
            bio,
            profile_picture,
            is_private,
            is_verified,
            is_active,
            is_suspended,
            role
          )
         VALUES
          ($1, $2, $3, $4, $5, $6, false, true, true, false, 'user')
         ON CONFLICT (email)
         DO UPDATE SET
           username = EXCLUDED.username,
           full_name = EXCLUDED.full_name,
           bio = EXCLUDED.bio,
           profile_picture = EXCLUDED.profile_picture,
           is_verified = true,
           is_active = true,
           is_suspended = false,
           deleted_at = NULL,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, username, full_name`,
        [
          email,
          username,
          passwordHash,
          fullName,
          bio,
          avatar
        ]
      );

      users.push(result.rows[0]);
    }

    const postIds = [];

    for (const user of users) {
      for (let i = 0; i < postTexts.length; i++) {
        const content =
          `${postTexts[i]} [${user.username}-${i + 1}]`;

        const existing = await client.query(
          `SELECT id
           FROM posts
           WHERE user_id = $1 AND content = $2
           LIMIT 1`,
          [user.id, content]
        );

        if (existing.rows.length) {
          postIds.push({
            id: existing.rows[0].id,
            userId: user.id
          });
          continue;
        }

        const result = await client.query(
          `INSERT INTO posts
            (user_id, content, privacy, type)
           VALUES
            ($1, $2, 'public', 'text')
           RETURNING id`,
          [user.id, content]
        );

        postIds.push({
          id: result.rows[0].id,
          userId: user.id
        });
      }
    }

    for (let i = 0; i < users.length; i++) {
      for (let j = 1; j <= 5; j++) {
        const target = users[(i + j) % users.length];

        await client.query(
          `INSERT INTO follows
            (follower_id, following_id, status)
           VALUES
            ($1, $2, 'accepted')
           ON CONFLICT (follower_id, following_id)
           DO NOTHING`,
          [users[i].id, target.id]
        );
      }
    }

    for (let i = 0; i < postIds.length; i++) {
      const post = postIds[i];
      const liker = users[(i + 3) % users.length];

      if (post.userId === liker.id) {
        continue;
      }

      const result = await client.query(
        `INSERT INTO reactions
          (user_id, post_id, reaction_type)
         VALUES
          ($1, $2, 'like')
         ON CONFLICT (user_id, post_id)
         DO NOTHING
         RETURNING id`,
        [liker.id, post.id]
      );

      if (result.rowCount > 0) {
        await client.query(
          `UPDATE posts
           SET likes_count = likes_count + 1
           WHERE id = $1`,
          [post.id]
        );
      }
    }

    await client.query('COMMIT');

    console.log('================================');
    console.log('VibePulse seed completed');
    console.log('Bots:', users.length);
    console.log('Posts:', postIds.length);
    console.log('Bot password:', BOT_PASSWORD);
    console.log('================================');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SEED ERROR:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
