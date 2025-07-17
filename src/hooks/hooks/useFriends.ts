import { useState, useEffect } from 'react';
// TEMPORARILY DISABLED: Firebase causing component registration issues
// import { doc, onSnapshot, getDoc } from 'firebase/firestore';
// import { db } from '@/services/firebase';
import { useAppContext } from '@/context/AppContext';

export interface FriendProfile {
  id: string;
  displayName?: string;
  avatar?: string;
  // Add any other fields you store on a user's public profile
}

export const useFriends = () => {
  const { user } = useAppContext();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TEMPORARILY DISABLED: Firebase causing component registration issues
    /*
    if (!user) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setLoading(false);
        return;
      }

      const userData = snapshot.data();
      const friendIds = userData.friends || [];

      if (friendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Fetch the profile for each friend ID
      const friendPromises = friendIds.map(async (friendId: string) => {
        const friendDocRef = doc(db, 'users', friendId);
        const friendDoc = await getDoc(friendDocRef);
        if (friendDoc.exists()) {
          return {
            id: friendDoc.id,
            ...friendDoc.data(),
          } as FriendProfile;
        }
        return null;
      });

      const resolvedFriends = (await Promise.all(friendPromises)).filter(
        (friend): friend is FriendProfile => friend !== null
      );

      setFriends(resolvedFriends);
      setLoading(false);
    });

    return () => unsubscribe();
    */
    
    // For now, just set loading to false with empty friends
    setLoading(false);
    setFriends([]);
  }, [user]);

  return { friends, loading };
}; 