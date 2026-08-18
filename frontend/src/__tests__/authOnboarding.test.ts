import {
  clearPendingAuthAction,
  peekPendingAuthAction,
  savePendingAuthAction,
  takePendingAuthAction,
} from '@/lib/pendingAuthAction';
import { needsOnboarding, USERNAME_PATTERN, firstIncompleteStep, isOnboardingRequired, writeOnboardingComplete } from '@/lib/onboarding';

describe('pendingAuthAction', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips a going action', () => {
    savePendingAuthAction({ type: 'going', partyId: 'abc' });
    expect(peekPendingAuthAction()).toEqual({ type: 'going', partyId: 'abc' });
    expect(takePendingAuthAction()).toEqual({ type: 'going', partyId: 'abc' });
    expect(peekPendingAuthAction()).toBeNull();
  });

  it('clears explicitly', () => {
    savePendingAuthAction({ type: 'addParty' });
    clearPendingAuthAction();
    expect(peekPendingAuthAction()).toBeNull();
  });

  it('rejects malformed payloads', () => {
    sessionStorage.setItem('temple_pending_auth_action', '{"type":"going"}');
    expect(peekPendingAuthAction()).toBeNull();
  });
});

describe('onboarding helpers', () => {
  it('needsOnboarding when username or school year missing', () => {
    expect(
      needsOnboarding({
        id: '1',
        email: 'a@temple.edu',
        username: null,
        is_admin: false,
        created_at: '',
        school_year: 'junior',
      })
    ).toBe(true);

    expect(
      needsOnboarding({
        id: '1',
        email: 'a@temple.edu',
        username: 'owl',
        is_admin: false,
        created_at: '',
        school_year: null,
      })
    ).toBe(true);

    expect(
      needsOnboarding({
        id: '1',
        email: 'a@temple.edu',
        username: 'owl',
        is_admin: false,
        created_at: '',
        school_year: 'junior',
      })
    ).toBe(false);
  });

  it('validates username charset', () => {
    expect(USERNAME_PATTERN.test('ab')).toBe(true);
    expect(USERNAME_PATTERN.test('a')).toBe(false);
    expect(USERNAME_PATTERN.test('has space')).toBe(false);
  });

  it('picks first incomplete step', () => {
    expect(
      firstIncompleteStep({
        id: '1',
        email: 'a@temple.edu',
        username: null,
        is_admin: false,
        created_at: '',
        school_year: null,
      })
    ).toBe('school-year');

    expect(
      firstIncompleteStep({
        id: '1',
        email: 'a@temple.edu',
        username: null,
        is_admin: false,
        created_at: '',
        school_year: 'freshman',
      })
    ).toBe('username');

    expect(
      firstIncompleteStep({
        id: '1',
        email: 'a@temple.edu',
        username: 'owl',
        is_admin: false,
        created_at: '',
        school_year: 'freshman',
      })
    ).toBe('avatar');
  });
});

describe('isOnboardingRequired', () => {
  const incomplete = {
    id: 'user-1',
    email: 'a@temple.edu',
    username: null as string | null,
    is_admin: false,
    created_at: '',
    school_year: null as string | null,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('sends new users with missing fields through onboarding', () => {
    expect(isOnboardingRequired(incomplete)).toBe(true);
  });

  it('does not reopen onboarding after it has been completed', () => {
    writeOnboardingComplete('user-1');
    expect(isOnboardingRequired(incomplete)).toBe(false);
  });

  it('latches completion when required fields are present', () => {
    expect(
      isOnboardingRequired({
        ...incomplete,
        username: 'owl',
        school_year: 'junior',
      })
    ).toBe(false);
    expect(isOnboardingRequired(incomplete)).toBe(false);
  });
});
