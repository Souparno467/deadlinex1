import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Calendar scopes approved by user
provider.addScope("https://www.googleapis.com/auth/calendar.readonly");
provider.addScope("https://www.googleapis.com/auth/calendar.events.readonly");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface SyncResult {
  success: boolean;
  count: number;
}

// Fetch upcoming Google Calendar events and send them to backend
export const syncGoogleCalendarWithBackend = async (accessToken: string): Promise<SyncResult> => {
  try {
    const now = new Date();
    const timeMin = now.toISOString();
    // Fetch upcoming events
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

    // Map to simplified schema
    const mappedEvents = items.map((item: any) => {
      const start = item.start?.dateTime || item.start?.date || "";
      const end = item.end?.dateTime || item.end?.date || "";
      
      // Clean to local ISO without Z
      const cleanStart = start.replace("Z", "").substring(0, 19);
      const cleanEnd = end.replace("Z", "").substring(0, 19);

      return {
        id: item.id,
        title: item.summary || "Untitled Event",
        start: cleanStart,
        end: cleanEnd,
        isMeeting: true
      };
    });

    // Post to backend sync endpoint
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
      count: mappedEvents.length
    };
  } catch (err) {
    console.error("Google Calendar background sync failed:", err);
    throw err;
  }
};
