'use client';

/**
 * Starts an OAuth sign-in through Auth.js (CSRF-protected POST), then returns to `callbackUrl`.
 * Guests keep their cookie through the round trip so their stats can be migrated.
 * Defaults to the current page so sign-in drops you back where you started.
 */
export async function startSignIn(provider: 'google' | 'discord', callbackUrl = window.location.pathname + window.location.search): Promise<void> {
  const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin' })
    .then((r) => r.json() as Promise<{ csrfToken: string }>)
    .catch(() => null);
  if (!csrf?.csrfToken) {
    alert('Sign-in is not available right now.');
    return;
  }
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `/api/auth/signin/${provider}`;
  for (const [name, value] of Object.entries({ csrfToken: csrf.csrfToken, callbackUrl })) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export async function signOut(): Promise<void> {
  const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin' }).then((r) => r.json() as Promise<{ csrfToken: string }>);
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/auth/signout';
  for (const [name, value] of Object.entries({ csrfToken: csrf.csrfToken, callbackUrl: '/' })) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
