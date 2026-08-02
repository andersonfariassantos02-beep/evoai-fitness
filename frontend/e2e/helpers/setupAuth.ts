import type { Page } from '@playwright/test';
import { setupSupabaseMocks, type MockSupabaseOptions } from './mockSupabase';

export async function authenticateUser(page: Page, options: MockSupabaseOptions = {}) {
  const userId = options.userId ?? 'user-test-id';
  const userEmail = options.userEmail ?? 'atleta@exemplo.com';

  await setupSupabaseMocks(page, options);

  // Set local storage session data before navigating
  await page.addInitScript(
    ({ uid, email }) => {
      const storageKey = 'sb-iillwhqjkuwljdliycke-auth-token';
      const sessionData = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: uid,
          email: email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: '2026-01-01T00:00:00Z',
        },
      };

      window.localStorage.setItem(storageKey, JSON.stringify(sessionData));
      window.localStorage.setItem(`evoai:profile-access:${uid}`, JSON.stringify({ timestamp: Date.now() }));
    },
    { uid: userId, email: userEmail }
  );
}
