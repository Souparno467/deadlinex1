import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  UserCredential,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/calendar.readonly");
provider.addScope("https://www.googleapis.com/auth/calendar.events.readonly");

const TOKEN_KEY = "deadlinex-google-token";
const SSO_ROLE_KEY = "deadlinex-sso-role";

const isBrowser = typeof window !== "undefined";

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let redirectResultPromise: Promise<UserCredential | null> | null = null;

/** Popup auth is unreliable on deployed hosts; redirect is safer in production. */
export const shouldUseRedirectAuth = (): boolean => {
  if (!isBrowser) return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
};

const persistToken = (token: string) => {
  cachedAccessToken = token;
  if (isBrowser) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
};

const loadPersistedToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  if (isBrowser) {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (stored) cachedAccessToken = stored;
  }
  return cachedAccessToken;
};

const clearPersistedToken = () => {
  cachedAccessToken = null;
  if (isBrowser) {
    sessionStorage.removeItem(TOKEN_KEY);
  }
};

export const storeSsoRole = (role: string) => {
  if (isBrowser) {
    sessionStorage.setItem(SSO_ROLE_KEY, role);
  }
};

export const consumeSsoRole = (): string => {
  if (!isBrowser) return "employee";
  const role = sessionStorage.getItem(SSO_ROLE_KEY) || "employee";
  sessionStorage.removeItem(SSO_ROLE_KEY);
  return role;
};

export const getFriendlyAuthError = (error: unknown): string => {
  const code = (error as { code?: string })?.code || "";
  const message = (error as { message?: string })?.message || "Sign-in failed.";

  if (code === "auth/popup-blocked") {
    return "Sign-in popup was blocked. Allow popups for this site or try again.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Sign-in was cancelled.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled for this Firebase project.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error during sign-in. Check your connection and try again.";
  }
  return message;
};

/** Call once on app load to complete a redirect-based sign-in. */
export const handleAuthRedirect = async (): Promise<{
  user: User;
  accessToken: string | null;
  role: string;
} | null> => {
  if (!isBrowser) return null;

  try {
    if (!redirectResultPromise) {
      redirectResultPromise = getRedirectResult(auth);
    }
    const result = await redirectResultPromise;
    if (!result) return null;

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    if (accessToken) persistToken(accessToken);

    return {
      user: result.user,
      accessToken,
      role: consumeSsoRole(),
    };
  } catch (error) {
    console.error("Redirect sign-in error:", error);
    throw error;
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      const token = loadPersistedToken();
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      clearPersistedToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (
  role: string = "employee"
): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;

    if (shouldUseRedirectAuth()) {
      storeSsoRole(role);
      await signInWithRedirect(auth, provider);
      return null;
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }

    persistToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: unknown) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return loadPersistedToken();
};

export const logout = async () => {
  await auth.signOut();
  clearPersistedToken();
  if (isBrowser) {
    sessionStorage.removeItem(SSO_ROLE_KEY);
  }
};

export interface SyncResult {
  success: boolean;
  count: number;
}

export const syncGoogleCalendarWithBackend = async (accessToken: string): Promise<SyncResult> => {
  try {
    const now = new Date();
    const timeMin = now.toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&singleEvents=true&orderBy=startTime&maxResults=30`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Google Calendar API error: ${res.statusText}`);
    }

    const data = await res.json();
    const items = data.items || [];

    const mappedEvents = items.map((item: any) => {
      const start = item.start?.dateTime || item.start?.date || "";
      const end = item.end?.dateTime || item.end?.date || "";
      const cleanStart = start.replace("Z", "").substring(0, 19);
      const cleanEnd = end.replace("Z", "").substring(0, 19);

      return {
        id: item.id,
        title: item.summary || "Untitled Event",
        start: cleanStart,
        end: cleanEnd,
        isMeeting: true,
      };
    });

    const backendRes = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ events: mappedEvents }),
    });

    if (!backendRes.ok) {
      throw new Error("Failed to push calendar events to backend.");
    }

    return {
      success: true,
      count: mappedEvents.length,
    };
  } catch (err) {
    console.error("Google Calendar background sync failed:", err);
    throw err;
  }
};
