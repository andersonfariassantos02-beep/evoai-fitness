import type { Page } from '@playwright/test';

export interface MockSupabaseOptions {
  isAdmin?: boolean;
  hasProfile?: boolean;
  userEmail?: string;
  userId?: string;
  profileName?: string;
  rejectLogin?: boolean;
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-expose-headers': 'Content-Range, content-range, Content-Type, prefer',
};

export async function setupSupabaseMocks(page: Page, options: MockSupabaseOptions = {}) {
  const {
    isAdmin = false,
    hasProfile = true,
    userEmail = 'atleta@exemplo.com',
    userId = 'user-test-id',
    profileName = 'Atleta Teste',
    rejectLogin = false,
  } = options;

  await page.route('**/*.supabase.co/**', async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    // Handle OPTIONS preflight requests
    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
    }

    // 1. Auth endpoints
    if (url.includes('/auth/v1/token')) {
      if (rejectLogin) {
        return route.fulfill({
          status: 400,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          }),
        });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: userId,
            email: userEmail,
            aud: 'authenticated',
            role: 'authenticated',
            created_at: '2026-01-01T00:00:00Z',
          },
        }),
      });
    }

    if (url.includes('/auth/v1/user')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          id: userId,
          email: userEmail,
          aud: 'authenticated',
          role: 'authenticated',
        }),
      });
    }

    if (url.includes('/auth/v1/signup')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: userId, email: userEmail },
          session: null,
        }),
      });
    }

    if (url.includes('/auth/v1/recover')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    }

    if (url.includes('/auth/v1/logout') || url.includes('/auth/v1/signout')) {
      return route.fulfill({
        status: 204,
        headers: corsHeaders,
        body: '',
      });
    }

    // Edge Functions
    if (url.includes('/functions/v1/admin-users')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            {
              id: userId,
              email: userEmail,
              role: 'admin',
              createdAt: '2026-01-01T00:00:00Z',
              lastSignInAt: '2026-01-01T00:00:00Z',
              emailConfirmedAt: '2026-01-01T00:00:00Z',
              disabled: false,
              testUser: false,
              profileComplete: true,
              profileName: profileName,
            },
          ],
        }),
      });
    }

    // 2. REST Database Endpoints
    if (url.includes('/rest/v1/profiles')) {
      if (method === 'HEAD' || url.includes('count=') || request.headers()['prefer']?.includes('count=')) {
        return route.fulfill({
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Range': hasProfile ? '0-0/1' : '0-0/0',
            'content-range': hasProfile ? '0-0/1' : '0-0/0',
          },
          body: JSON.stringify(hasProfile ? [{ id: 'profile-1' }] : []),
        });
      }

      if (!hasProfile) {
        return route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'profile-1',
            linked_user_id: userId,
            display_name: profileName,
            birth_date: '1995-05-15',
            active: true,
            training_goal: 'hypertrophy',
            training_focus: ['chest', 'back'],
            created_at: '2026-01-01T00:00:00Z',
          },
        ]),
      });
    }

    if (url.includes('/rest/v1/profile_restrictions')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'restr-1',
            profile_id: 'profile-1',
            category: 'injury',
            severity: 'avoid',
            description: 'Ombro direito sensível',
            starts_on: '2026-01-01',
            ends_on: null,
            active: true,
            created_at: '2026-01-01T00:00:00Z',
          },
        ]),
      });
    }

    if (url.includes('/rest/v1/user_roles')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify(
          isAdmin
            ? [{ id: 'ur-1', user_id: userId, role: 'admin', created_at: '2026-01-01T00:00:00Z' }]
            : []
        ),
      });
    }

    if (url.includes('/rest/v1/app_admins')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify(isAdmin ? [{ user_id: userId }] : []),
      });
    }

    if (url.includes('/rest/v1/exercise_catalog')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            key: 'supino-reto-barra',
            name: 'Supino reto com barra',
            default_sets: 3,
            reps_min: 8,
            reps_max: 12,
            muscle: 'peito',
            movement: 'empurrar-horizontal',
            equipment: 'barra',
            avoid_when: [],
            instructions: 'Mantenha as escápulas apoiadas.',
            cautions: [],
            media_url: null,
            equipment_variants: ['halteres'],
            active: true,
            muscle_region: 'peitoral',
            secondary_muscles: ['triceps'],
            mechanics: 'composto',
            laterality: 'bilateral',
            resistance_profile: 'ascendente',
            movement_vector: 'horizontal',
            systemic_demand: 'moderada',
            stability_demand: 'alta',
            technical_complexity: 'moderada',
            exercise_family: 'supino',
          },
          {
            key: 'puxada-frontal',
            name: 'Puxada frontal',
            default_sets: 3,
            reps_min: 8,
            reps_max: 12,
            muscle: 'costas',
            movement: 'puxar-vertical',
            equipment: 'cabo',
            avoid_when: [],
            instructions: 'Controle a descida.',
            cautions: [],
            media_url: null,
            equipment_variants: [],
            active: true,
            muscle_region: 'dorsal',
            secondary_muscles: ['biceps'],
            mechanics: 'composto',
            laterality: 'bilateral',
            resistance_profile: 'constante',
            movement_vector: 'vertical',
            systemic_demand: 'moderada',
            stability_demand: 'baixa',
            technical_complexity: 'baixa',
            exercise_family: 'puxada',
          },
        ]),
      });
    }

    if (url.includes('/rest/v1/workout_sessions')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (url.includes('/rest/v1/body_measurements')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (url.includes('/rest/v1/personal_records')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (url.includes('/rest/v1/training_cycles')) {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    // Default mock response for any other Supabase REST queries
    return route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}
