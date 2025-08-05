/* AppContext.tsx */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Review, reviews as initialReviews } from '../../data/reviews';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { usePathname } from 'expo-router';

// User Profile Interface
export interface UserProfile {
  username?: string; // Unique username for friend discovery
  genres: string[];
  runtime: 'short' | 'medium' | 'long'; // short: <30min, medium: 30-60min, long: >60min
  language: string; // 'en', 'es', 'fr', etc.
  genreWeights: Record<string, number>; // implicit feedback weights
}

// User Interaction Event
export interface UserInteraction {
  type: 'save' | 'rate' | 'complete' | 'skip' | 'watch' | 'click';
  showId: string;
  timestamp: number;
  metadata?: {
    rating?: number;
    watchTime?: number; // seconds watched
    genre?: string;
    runtime?: number;
  };
}

interface AppContextType {
  user: User | null;
  savedShows: string[];
  reviews: Review[];
  userProfile: UserProfile;
  friends: any[];
  sharedShows: any[];
  addFriend: (friend: any) => void;
  removeFriend: (friendId: string) => void;
  markSharedShowAsRead: (sharedShowId: string) => void;
  getUnreadSharedShows: () => any[];
  toggleSaved: (showId: string | number) => void;
  isShowSaved: (showId: string) => boolean;
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;
  getShowReviews: (showId: string) => Review[];
  logInteraction: (interaction: Omit<UserInteraction, 'timestamp'>) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateGenreWeight: (genre: string, delta: number) => Promise<void>;
  logout: () => void;
  // Username and friend discovery functions
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  searchUserByUsername: (username: string) => Promise<any | null>;
  addFriendByUsername: (username: string) => Promise<boolean>;
  shareShowWithFriend: (showId: string, friendId: string, message?: string) => Promise<void>;
}

const STORAGE_SHOWS = '@saved';
const STORAGE_EVENTS = 'events';
const STORAGE_PROFILE = '@userProfile';
const STORAGE_DISABLE_AUTO_GUEST = '@disableAutoGuestSignIn';

const canon = (id: string | number) =>
  typeof id === 'string' && id.includes('-') ? id : `tv-${id}`;

const AppContext = createContext<AppContextType | undefined>(undefined);

// Default user profile
const defaultProfile: UserProfile = {
  username: undefined,
  genres: [],
  runtime: 'medium',
  language: 'en',
  genreWeights: {},
};

export function AppProvider({ children }: { children: ReactNode }) {
  // ────────────────────────────────────────────────────────────
  // User Profile  ➜  Firestore + AsyncStorage (hybrid)
  // ────────────────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [user, setUser] = useState<User | null>(null);
  const [disableAutoGuestSignIn, setDisableAutoGuestSignIn] = useState(false);
  const [justSignedOut, setJustSignedOut] = useState(false);
  const [signOutTimestamp, setSignOutTimestamp] = useState<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const pathname = usePathname();

  // Check if auto guest sign-in should be disabled on app start
  useEffect(() => {
    const checkAutoSignInDisabled = async () => {
      try {
        const disabled = await AsyncStorage.getItem(STORAGE_DISABLE_AUTO_GUEST);
        if (disabled === 'true') {
          console.log('🚫 Auto guest sign-in disabled from storage');
          setDisableAutoGuestSignIn(true);
        }
      } catch (error) {
        console.warn('Failed to check auto sign-in disabled flag:', error);
      }
    };

    checkAutoSignInDisabled();
    
    // Mark initial load as complete after a short delay
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
      setIsInitialized(true);
    }, 2000); // 2 second delay for initial load

    return () => clearTimeout(timer);
  }, []);

  // Handle user authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('🔄 AppContext: Auth state changed:', currentUser?.email || (currentUser?.isAnonymous ? 'Anonymous User' : 'No User'));
      
      // Check if we just signed out
      if (!currentUser && user) {
        const now = Date.now();
        console.log('🔄 User just signed out! Preventing auto sign-in for 5 seconds');
        setJustSignedOut(true);
        setSignOutTimestamp(now);
        setDisableAutoGuestSignIn(true); // Aggressively disable auto sign-in
        
        // Clear the flag after 5 seconds
        setTimeout(() => {
          console.log('🔄 Clearing sign-out prevention flag');
          setJustSignedOut(false);
          setSignOutTimestamp(null);
        }, 5000);
      }
      
      // If a new anonymous user signs in, check if this was a manual action
      if (currentUser && currentUser.isAnonymous && !user) {
        console.log('🔄 New anonymous user detected - checking if manual sign-in');
        
        // Check if auto guest sign-in is disabled (indicating manual sign-in)
        const autoGuestDisabled = await AsyncStorage.getItem(STORAGE_DISABLE_AUTO_GUEST);
        if (autoGuestDisabled === 'false') {
          console.log('✅ Manual anonymous sign-in detected - resetting prevention flags');
          setDisableAutoGuestSignIn(false);
          setJustSignedOut(false);
          setSignOutTimestamp(null);
        }
      }
      
      setUser(currentUser);
      
      // Get current route
      let currentPath = pathname;
      if (!currentPath && typeof window !== 'undefined') {
        // fallback for SSR or if usePathname is not available
        currentPath = window.location?.pathname || '';
      }

      if (currentUser) {
        // Reset disableAutoGuestSignIn if user is not anonymous (manual sign-in)
        if (!currentUser.isAnonymous) {
          setDisableAutoGuestSignIn(false);
          await AsyncStorage.setItem(STORAGE_DISABLE_AUTO_GUEST, 'false');
        }
        // Create or load user profile in Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // Create new user profile
            console.log('Creating new user profile in Firestore');
            
            try {
              const userData = {
                email: currentUser.email,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                profile: defaultProfile,
                friends: [],
                savedShows: [],
                lastActive: new Date().toISOString(),
              };
              
              await setDoc(userDocRef, userData);
              
              // Set local profile to default
              setUserProfile(defaultProfile);
              console.log('✅ New user profile created successfully');
            } catch (createError: any) {
              console.warn('⚠️ Failed to create user profile in Firestore (offline?):', createError.message);
              // Fallback to local storage
              setUserProfile(defaultProfile);
              await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(defaultProfile));
            }
          } else {
            // Load existing user profile
            const userData = userDoc.data();
            const firestoreProfile = userData.profile || defaultProfile;
            setUserProfile(firestoreProfile);
            
            // Sync to local storage
            await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(firestoreProfile));
            console.log('✅ User profile loaded from Firestore');
          }
        } catch (error: any) {
          console.warn('⚠️ Failed to load user profile from Firestore (offline?):', error.message);
          // Fallback to local storage
          try {
            const localProfile = await AsyncStorage.getItem(STORAGE_PROFILE);
            if (localProfile) {
              const profile = JSON.parse(localProfile);
              setUserProfile({ ...defaultProfile, ...profile });
              console.log('✅ User profile loaded from local storage');
            } else {
              setUserProfile(defaultProfile);
              console.log('✅ Using default user profile');
            }
          } catch (localError) {
            console.error('❌ Failed to load from local storage:', localError);
            setUserProfile(defaultProfile);
          }
        }
      } else {
        // No user signed in, try anonymous sign-in only if not disabled and not on auth screens
        const isAuthFlow = currentPath.startsWith('/onboarding') || 
                          currentPath.startsWith('/(auth)') || 
                          currentPath.startsWith('/auth') || 
                          currentPath.startsWith('/(welcome)') ||
                          currentPath === '/' ||
                          currentPath === '';
        
        // Check if user just logged out by checking timestamp
        const recentSignOut = signOutTimestamp && (Date.now() - signOutTimestamp) < 15000; // 15 seconds
        
        // More comprehensive blocking conditions
        const shouldBlockAutoSignIn = isAuthFlow || 
                                    disableAutoGuestSignIn || 
                                    justSignedOut ||
                                    recentSignOut || // Additional check for recent sign out
                                    currentPath === '/' ||
                                    currentPath === '' ||
                                    !currentPath || // Block if no path is available yet
                                    isInitialLoad || // Block during initial app load
                                    currentPath.includes('profile'); // Block if still on profile page
        
        // Only attempt auto sign-in if explicitly safe to do so
        if (!shouldBlockAutoSignIn && 
            currentPath && 
            currentPath !== '/' && 
            currentPath !== '' &&
            !isAuthFlow &&
            !currentPath.includes('profile') &&
            !currentPath.includes('welcome')) {
          
          console.log('🚨 Auto guest sign-in triggered!');
          console.log('   Conditions: path=' + currentPath + ', isAuthFlow=' + isAuthFlow + ', disabled=' + disableAutoGuestSignIn);
          
          // Add a delay to prevent race conditions with routing
          setTimeout(async () => {
            // Double-check conditions before actually signing in
            if (!disableAutoGuestSignIn && !justSignedOut && !recentSignOut) {
              try {
                await signInAnonymously(auth);
              } catch (error: any) {
                console.error("❌ Anonymous sign-in failed:", error.message);
                
                // If anonymous sign-in fails due to network, still set up local profile
                if (error.message?.includes('offline') || error.message?.includes('network')) {
                  console.log('📱 Offline mode - setting up local profile');
                  const localProfile = await AsyncStorage.getItem(STORAGE_PROFILE);
                  if (localProfile) {
                    const profile = JSON.parse(localProfile);
                    setUserProfile({ ...defaultProfile, ...profile });
                  } else {
                    setUserProfile(defaultProfile);
                  }
                }
              }
            } else {
              console.log('🚫 Auto guest sign-in cancelled - conditions changed');
            }
          }, 2000); // Increased delay to 2 seconds
        } else {
          console.log('✅ Auto guest sign-in blocked');
          console.log('   Reasons: isAuthFlow=' + isAuthFlow + ', disabled=' + disableAutoGuestSignIn + ', justSignedOut=' + justSignedOut + ', recentSignOut=' + recentSignOut + ', path=' + currentPath);
        }
      }
    });

    return () => unsubscribe();
  }, [disableAutoGuestSignIn, pathname, justSignedOut, user, signOutTimestamp, isInitialLoad]);

  // Load user profile from local storage as fallback
  useEffect(() => {
    if (!user) {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_PROFILE);
          if (raw) {
            const profile = JSON.parse(raw);
            setUserProfile({ ...defaultProfile, ...profile });
          }
        } catch (e) {
          console.warn('Failed to load user profile from local storage', e);
        }
      })();
    }
  }, [user]);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    console.log('🔄 updateUserProfile called with:', updates);
    console.log('🔄 Current userProfile:', userProfile);
    console.log('🔄 User authenticated:', !!user);
    
    try {
      // Ensure username is stored in lowercase for consistent searching
      const processedUpdates = { ...updates };
      if (updates.username) {
        processedUpdates.username = updates.username.toLowerCase();
        console.log('🔄 Username processed to lowercase:', processedUpdates.username);
      }
      
      const newProfile = { ...userProfile, ...processedUpdates };
      console.log('🔄 New profile created:', newProfile);
      
      console.log('🔄 Setting profile state...');
      setUserProfile(newProfile);
      console.log('✅ Profile state updated');
      
      console.log('🔄 Saving to AsyncStorage...');
      // Update local storage
      await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(newProfile));
      console.log('✅ Profile saved to AsyncStorage');
      
      // Update Firestore if user is authenticated (but skip for anonymous users to avoid hangs)
      if (user && !user.isAnonymous) {
        console.log('🔄 Authenticated non-anonymous user, updating Firestore...');
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const updateData = {
            profile: newProfile,
            updatedAt: new Date().toISOString(),
            // Include other necessary fields in case document doesn't exist yet
            email: user.email,
            lastActive: new Date().toISOString(),
          };
          
          console.log('🔄 Calling setDoc with merge for safe update...');
          // Use setDoc with merge option instead of updateDoc to handle cases where document doesn't exist yet
          await setDoc(userDocRef, updateData, { merge: true });
          console.log('✅ User profile updated in Firestore');
        } catch (error: any) {
          console.warn('⚠️ Failed to update profile in Firestore (offline?):', error.message);
          console.warn('⚠️ Firestore error details:', error);
          // Profile is still saved locally, will sync when online
        }
      } else if (user && user.isAnonymous) {
        console.log('👤 Anonymous user detected, skipping Firestore update (local storage only)');
      } else {
        console.log('📱 No user authenticated, skipping Firestore update');
      }
      
      console.log('✅ updateUserProfile completed successfully');
    } catch (error: any) {
      console.error('🚨 Error in updateUserProfile:', error);
      throw error; // Re-throw to let calling function handle it
    }
  }, [userProfile, user]);

  const updateGenreWeight = useCallback(async (genre: string, delta: number) => {
    const currentWeight = userProfile.genreWeights[genre] || 0;
    const newWeight = Math.max(0, currentWeight + delta);
    
    const newProfile = {
      ...userProfile,
      genreWeights: {
        ...userProfile.genreWeights,
        [genre]: newWeight,
      },
    };
    
    setUserProfile(newProfile);
    
    // Update local storage
    await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(newProfile));
    
    // Update Firestore if user is authenticated
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          profile: newProfile,
          updatedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.warn('⚠️ Failed to update genre weights in Firestore (offline?):', error.message);
        // Weights are still saved locally, will sync when online
      }
    }
  }, [userProfile, user]);

  // ────────────────────────────────────────────────────────────
  // Saved list  ➜  Firestore + AsyncStorage (hybrid)
  // ────────────────────────────────────────────────────────────
  const [savedShows, setSavedShows] = useState<string[]>([]);

  // Load saved shows from Firestore or local storage
  useEffect(() => {
    if (user) {
      // Load from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const firestoreSavedShows = userData.savedShows || [];
          setSavedShows(firestoreSavedShows);
          
          // Sync to local storage
          AsyncStorage.setItem(STORAGE_SHOWS, JSON.stringify(firestoreSavedShows));
          console.log('✅ Saved shows synced from Firestore');
        }
      }, (error) => {
        console.warn('⚠️ Failed to load saved shows from Firestore (offline?):', error.message);
        // Fallback to local storage
        (async () => {
          try {
            const raw = await AsyncStorage.getItem(STORAGE_SHOWS);
            if (raw) {
              setSavedShows(JSON.parse(raw));
              console.log('✅ Loaded saved shows from local storage');
            }
          } catch (e) {
            console.warn('❌ Failed to load saved shows from local storage', e);
          }
        })();
      });
      
      return () => unsubscribe();
    } else {
      // Load from local storage as fallback
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_SHOWS);
          if (raw) {
            setSavedShows(JSON.parse(raw));
            console.log('✅ Loaded saved shows from local storage (no user)');
          }
        } catch (e) {
          console.warn('❌ Failed to load saved shows from local storage', e);
        }
      })();
    }
  }, [user]);

  const toggleSaved = useCallback(async (rawId: string | number) => {
    const id = canon(rawId);
    const newSavedShows = savedShows.includes(id) 
      ? savedShows.filter(x => x !== id) 
      : [...savedShows, id];
    
    setSavedShows(newSavedShows);
    
    // Update local storage
    await AsyncStorage.setItem(STORAGE_SHOWS, JSON.stringify(newSavedShows));
    
    // Update Firestore if user is authenticated
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          savedShows: newSavedShows,
          updatedAt: new Date().toISOString(),
        });
        console.log('✅ Saved shows updated in Firestore');
      } catch (error: any) {
        console.warn('⚠️ Failed to update saved shows in Firestore (offline?):', error.message);
        // Saved shows are still saved locally, will sync when online
      }
    }
    
    // Log interaction
    logInteraction({ type: 'save', showId: id });
  }, [savedShows, user]);

  const isShowSaved = useCallback(
    (showId: string) => savedShows.includes(canon(showId)),
    [savedShows]
  );

  // ────────────────────────────────────────────────────────────
  // Reviews  ➜  Firestore
  // ────────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<Review[]>(initialReviews);

  // Load reviews from Firestore
  useEffect(() => {
    if (user) {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
        const firestoreReviews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];
        
        setReviews(firestoreReviews);
        console.log('✅ Reviews synced from Firestore');
      }, (error) => {
        console.warn('⚠️ Failed to load reviews from Firestore (offline?):', error.message);
        // Keep existing reviews in memory as fallback
        console.log('📱 Using existing reviews in memory');
      });
      
      return () => unsubscribe();
    } else {
      // No user - use initial reviews
      console.log('📱 No user authenticated, using initial reviews');
    }
  }, [user]);

  const addReview = useCallback(async (review: Omit<Review, 'id' | 'createdAt'>) => {
    const newReview: Review = {
      ...review,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    // Add to local state immediately
    setReviews((prev) => [newReview, ...prev]);
    
    // Add to Firestore if user is authenticated
    if (user) {
      try {
        await addDoc(collection(db, 'reviews'), {
          ...newReview,
          authorId: user.uid,
          authorEmail: user.email,
        });
      } catch (error) {
        console.error('Failed to add review to Firestore:', error);
      }
    }
    
    // Log interaction
    logInteraction({ type: 'rate', showId: review.showId, metadata: { rating: review.rating } });
  }, [user]);

  const getShowReviews = useCallback(
    (showId: string) => reviews.filter((r) => r.showId === showId),
    [reviews]
  );

  // ────────────────────────────────────────────────────────────
  // Enhanced interaction logger with Firestore
  // ────────────────────────────────────────────────────────────
  const logInteraction = useCallback(async (interaction: Omit<UserInteraction, 'timestamp'>) => {
    const fullInteraction: UserInteraction = {
      ...interaction,
      timestamp: Date.now(),
    };
    
    // Store locally for offline access
    const raw = await AsyncStorage.getItem(STORAGE_EVENTS);
    const events: UserInteraction[] = raw ? JSON.parse(raw) : [];
    events.push(fullInteraction);
    await AsyncStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
    
    // Store in Firestore if user is authenticated
    if (user) {
      try {
        // Clean metadata to remove undefined values
        const cleanMetadata: any = {};
        if (interaction.metadata) {
          Object.entries(interaction.metadata).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              cleanMetadata[key] = value;
            }
          });
        }
        
        const cleanInteraction = {
          ...fullInteraction,
          metadata: cleanMetadata,
          userId: user.uid,
        };
        
        await addDoc(collection(db, 'users', user.uid, 'interactions'), cleanInteraction);
        
        // Update user's last active timestamp
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          lastActive: new Date().toISOString(),
        });
        
        console.log('✅ Interaction logged to Firestore:', {
          type: interaction.type,
          showId: interaction.showId,
          userId: user.uid,
        });
      } catch (error) {
        console.error('❌ Failed to log interaction to Firestore:', error);
        console.error('Interaction data:', fullInteraction);
      }
    } else {
      console.log('⚠️ No user authenticated, interaction stored locally only');
    }
  }, [user]);

  // Add a logout function that sets the flag
  const logout = useCallback(async () => {
    console.log('🚪 Logging out user...');
    
    // Set flags to prevent auto sign-in
    setDisableAutoGuestSignIn(true);
    setJustSignedOut(true);
    setSignOutTimestamp(Date.now());
    
    // Store the disabled state persistently
    await AsyncStorage.setItem(STORAGE_DISABLE_AUTO_GUEST, 'true');
    
    // Clear user profile from state
    setUserProfile(defaultProfile);
    
    // Clear saved shows from state
    setSavedShows([]);
    
    // Clear reviews from state
    setReviews([]);
    
    // Clear user-specific onboarding status to ensure new users go through onboarding
    if (user) {
      const userOnboardingKey = `onboarded_${user.uid}`;
      await AsyncStorage.removeItem(userOnboardingKey);
      console.log('🧹 Cleared user-specific onboarding status');
    }
    
    // Clear general onboarding status as well
    await AsyncStorage.removeItem('onboarded');
    await AsyncStorage.removeItem('userGenres');
    
    // Sign out from Firebase
    try {
      await auth.signOut();
      console.log('✅ Firebase sign out successful');
    } catch (error) {
      console.error('❌ Firebase sign out failed:', error);
    }
    
    // Navigate to welcome screen AFTER clearing everything
    console.log('🔄 Navigating to welcome screen...');
    // Import router dynamically to avoid circular dependencies
    const { router } = await import('expo-router');
    router.replace('/(welcome)');
    
    // Keep the prevention flags active longer to ensure no auto guest sign-in
    setTimeout(() => {
      console.log('🔄 Clearing logout prevention flags after 10 seconds');
      setJustSignedOut(false);
      setSignOutTimestamp(null);
      // Keep disableAutoGuestSignIn true permanently until manually overridden
    }, 10000); // Extended to 10 seconds
    
    console.log('✅ Logout completed');
  }, [user]);

  // ────────────────────────────────────────────────────────────
  const [friends, setFriends] = useState<any[]>([]);
  const [sharedShows, setSharedShows] = useState<any[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingSharedShows, setIsLoadingSharedShows] = useState(false);

  // Load friends list
  const loadFriends = useCallback(async () => {
    if (!user) return;
    
    // Skip loading friends for anonymous users
    if (user.isAnonymous) {
      console.log('Skipping friends loading for anonymous user');
      setFriends([]);
      setIsLoadingFriends(false);
      return;
    }
    
    setIsLoadingFriends(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const friendIds = userData.friends || [];
        
        if (friendIds.length > 0) {
          // Fetch friend details
          const friendsData = await Promise.all(
            friendIds.map(async (friendId: string) => {
              try {
                const friendDoc = await getDoc(doc(db, 'users', friendId));
                if (friendDoc.exists()) {
                  const friendData = friendDoc.data();
                  return {
                    id: friendId,
                    email: friendData.email,
                    username: friendData.profile?.username,
                    displayName: friendData.profile?.displayName || friendData.email,
                    createdAt: friendData.createdAt,
                  };
                }
                return null;
              } catch (error) {
                console.error('Error fetching friend data:', error);
                return null;
              }
            })
          );
          
          setFriends(friendsData.filter(Boolean));
        } else {
          setFriends([]);
        }
      }
    } catch (error: any) {
      console.error('Error loading friends:', error);
      // Handle offline error gracefully
      if (error.message?.includes('offline') || error.message?.includes('Failed to get document')) {
        console.log('Device appears to be offline, friends will load when connection is restored');
        // Don't show error to user, just set empty friends list
        setFriends([]);
      } else {
        // For other errors, still set empty friends but log the error
        setFriends([]);
      }
    } finally {
      setIsLoadingFriends(false);
    }
  }, [user]);

  // Load shared shows
  const loadSharedShows = useCallback(async () => {
    if (!user) return;
    
    // Skip loading shared shows for anonymous users
    if (user.isAnonymous) {
      console.log('Skipping shared shows loading for anonymous user');
      setSharedShows([]);
      setIsLoadingSharedShows(false);
      return;
    }
    
    setIsLoadingSharedShows(true);
    try {
      // Get shows shared with current user
      const sharedShowsRef = collection(db, 'sharedShows');
      const q = query(
        sharedShowsRef,
        where('sharedWith', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const sharedShowsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSharedShows(sharedShowsData);
    } catch (error: any) {
      console.error('Error loading shared shows:', error);
      // Handle offline error gracefully
      if (error.message?.includes('offline') || error.message?.includes('Failed to get document')) {
        console.log('Device appears to be offline, shared shows will load when connection is restored');
        // Don't show error to user, just set empty shared shows
        setSharedShows([]);
      } else {
        // For other errors, still set empty shared shows but log the error
        setSharedShows([]);
      }
    } finally {
      setIsLoadingSharedShows(false);
    }
  }, [user]);

  // Load friends and shared shows when user changes
  useEffect(() => {
    if (user) {
      loadFriends();
      loadSharedShows();
    } else {
      setFriends([]);
      setSharedShows([]);
    }
  }, [user, loadFriends, loadSharedShows]);

  return (
    <AppContext.Provider
      value={{
        user,
        savedShows,
        reviews,
        userProfile,
        friends,
        sharedShows,
        addFriend: (friend: any) => {
          setFriends(prev => [...prev, friend]);
        },
        removeFriend: async (friendId: string) => {
          if (!user) return;
          
          try {
            // Remove from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const currentFriends = userData.friends || [];
              const updatedFriends = currentFriends.filter((id: string) => id !== friendId);
              
              await updateDoc(userDocRef, {
                friends: updatedFriends,
                updatedAt: new Date().toISOString(),
              });
              
              // Update local state
              setFriends(prev => prev.filter(friend => friend.id !== friendId));
              console.log('✅ Friend removed successfully');
            }
          } catch (error) {
            console.error('Error removing friend:', error);
          }
        },
        markSharedShowAsRead: async (sharedShowId: string) => {
          if (!user) return;
          
          try {
            const sharedShowRef = doc(db, 'sharedShows', sharedShowId);
            await updateDoc(sharedShowRef, {
              isRead: true,
              readAt: new Date().toISOString(),
            });
            
            // Update local state
            setSharedShows(prev => 
              prev.map(show => 
                show.id === sharedShowId 
                  ? { ...show, isRead: true, readAt: new Date().toISOString() }
                  : show
              )
            );
            
            console.log('✅ Shared show marked as read');
          } catch (error) {
            console.error('Error marking shared show as read:', error);
          }
        },
        getUnreadSharedShows: () => {
          return sharedShows.filter(show => !show.isRead);
        },
        toggleSaved,
        isShowSaved,
        addReview,
        getShowReviews,
        logInteraction,
        updateUserProfile,
        updateGenreWeight,
        logout,
        // Username and friend discovery functions
        checkUsernameAvailability: async (username: string) => {
          if (!username || username.length < 3) return false;
          
          try {
            // Check if username is already taken
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('profile.username', '==', username.toLowerCase()));
            const querySnapshot = await getDocs(q);
            
            // Username is available if no documents found
            return querySnapshot.empty;
          } catch (error) {
            console.error('Error checking username availability:', error);
            return false;
          }
        },
        searchUserByUsername: async (username: string) => {
          if (!username || username.length < 3) return null;
          
          const searchUsername = username.toLowerCase();
          
          try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('profile.username', '==', searchUsername));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0];
              const userData = userDoc.data();
              
              return {
                id: userDoc.id,
                email: userData.email,
                username: userData.profile?.username,
                displayName: userData.profile?.displayName || userData.email,
                createdAt: userData.createdAt,
              };
            }
            
            return null;
          } catch (error) {
            console.error('Error searching for user by username:', error);
            return null;
          }
        },
        addFriendByUsername: async (username: string) => {
          if (!user) return false;
          
          try {
            // Find the user by username
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('profile.username', '==', username.toLowerCase()));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
              console.log('User not found with username:', username);
              return false;
            }
            
            const foundUserDoc = querySnapshot.docs[0];
            const foundUserData = foundUserDoc.data();
            const foundUser = {
              id: foundUserDoc.id,
              email: foundUserData.email,
              username: foundUserData.profile?.username,
              displayName: foundUserData.profile?.displayName || foundUserData.email,
              createdAt: foundUserData.createdAt,
            };
            
            // Don't add yourself as a friend
            if (foundUser.id === user.uid) {
              console.log('Cannot add yourself as a friend');
              return false;
            }
            
            // Add friend to current user's friends list
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const currentFriends = userData.friends || [];
              
              // Check if already friends
              if (currentFriends.includes(foundUser.id)) {
                console.log('Already friends with this user');
                return false;
              }
              
              // Add to friends list
              await updateDoc(userDocRef, {
                friends: [...currentFriends, foundUser.id],
                updatedAt: new Date().toISOString(),
              });
              
              // Reload friends list
              await loadFriends();
              
              console.log('✅ Friend added successfully:', foundUser.username);
              return true;
            }
            
            return false;
          } catch (error) {
            console.error('Error adding friend by username:', error);
            return false;
          }
        },
        shareShowWithFriend: async (showId: string, friendId: string, message?: string) => {
          if (!user) return;
          
          try {
            // Create shared show document
            const sharedShow = {
              showId,
              sharedBy: user.uid,
              sharedWith: friendId,
              message: message || '',
              isRead: false,
              createdAt: new Date().toISOString(),
            };
            
            // Add to shared shows collection
            await addDoc(collection(db, 'sharedShows'), sharedShow);
            
            // Reload shared shows to update the list
            await loadSharedShows();
            
            console.log('✅ Show shared successfully with friend');
          } catch (error) {
            console.error('Error sharing show with friend:', error);
            throw error; // Re-throw to handle in UI
          }
        },
      }}
    >
      {isInitialized ? children : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
          <ActivityIndicator size="large" color="#FF0050" />
          <Text style={{ color: 'white', marginTop: 20, fontSize: 16 }}>
            Initializing...
          </Text>
        </View>
      )}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    console.warn('useAppContext called before AppProvider is ready, returning safe defaults');
    // Return safe defaults instead of throwing
    return {
      user: null,
      savedShows: [],
      reviews: [],
      userProfile: defaultProfile,
      friends: [],
      sharedShows: [],
      addFriend: () => {},
      removeFriend: () => {},
      markSharedShowAsRead: () => {},
      getUnreadSharedShows: () => [],
      toggleSaved: () => {},
      isShowSaved: () => false,
      addReview: () => {},
      getShowReviews: () => [],
      logInteraction: () => {},
      updateUserProfile: async () => {},
      updateGenreWeight: async () => {},
      logout: () => {},
      checkUsernameAvailability: async () => false,
      searchUserByUsername: async () => null,
      addFriendByUsername: async () => false,
      shareShowWithFriend: async () => {},
    };
  }
  return ctx;
}
