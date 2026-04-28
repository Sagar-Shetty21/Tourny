"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { signInWithCustomToken, User, onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

interface FirebaseContextType {
  firebaseUser: User | null;
  isFirebaseReady: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  firebaseUser: null,
  isFirebaseReady: false,
});

export function useFirebase() {
  return useContext(FirebaseContext);
}

export default function FirebaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  const initFirebase = useCallback(async () => {
    try {
      const auth = getFirebaseAuth();
      // Check if already signed in
      if (auth.currentUser) {
        setFirebaseUser(auth.currentUser);
        setIsFirebaseReady(true);
        return;
      }

      const res = await fetch("/api/auth/firebase-token", { method: "POST" });
      if (!res.ok) {
        console.error("Failed to get Firebase token");
        setIsFirebaseReady(true);
        return;
      }

      const { token } = await res.json();
      const userCredential = await signInWithCustomToken(auth, token);
      setFirebaseUser(userCredential.user);
    } catch (error) {
      console.error("Firebase auth error:", error);
    } finally {
      setIsFirebaseReady(true);
    }
  }, []);

  useEffect(() => {
    initFirebase();

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setFirebaseUser(user);
    });

    return () => unsubscribe();
  }, [initFirebase]);

  return (
    <FirebaseContext.Provider value={{ firebaseUser, isFirebaseReady }}>
      {children}
    </FirebaseContext.Provider>
  );
}
