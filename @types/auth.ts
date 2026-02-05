import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      initials: string | null;
      character: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    initials?: string | null;
    character?: string | null;
  }
}

declare module '@auth/core/adapters' {
  interface AdapterUser {
    initials?: string | null;
    character?: string | null;
  }
}
