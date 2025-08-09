import { useState, useEffect, createContext, useContext } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, LearningProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const createDefaultLearningProfile = (): LearningProfile => ({
  preferredLearningStyle: 'mixed',
  conceptualUnderstanding: 5,
  practicalSkills: 5,
  preferredPace: 'medium',
  interestsTopics: [],
  difficultConcepts: [],
  masteredConcepts: [],
  totalInteractions: 0,
  averageSessionDuration: 0,
  preferredExplanationDepth: 'intermediate',
  responseToEncouragement: 5,
  confusionPatterns: []
});

export function AuthProvider({ children }: { children: React.ReactNode }) {  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const createUserProfile = async (firebaseUser: FirebaseUser): Promise<User> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const newUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        learningProfile: createDefaultLearningProfile(),
        createdAt: new Date(),
        lastActiveAt: new Date()
      };

      await setDoc(userRef, {
        ...newUser,
        createdAt: newUser.createdAt.toISOString(),
        lastActiveAt: newUser.lastActiveAt.toISOString()
      });

      return newUser;
    } else {
      const userData = userSnap.data();
      return {
        ...userData,
        createdAt: new Date(userData.createdAt),
        lastActiveAt: new Date(userData.lastActiveAt)
      } as User;
    }
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const user = await createUserProfile(firebaseUser);
          setCurrentUser(user);
        } catch (error) {
          console.error('Error creating user profile:', error);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);
  const value = {
    currentUser,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
