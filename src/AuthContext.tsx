import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, testConnection, initializeDefaultData } from './firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Check if user exists in DB, if not create them
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let role = 'user';
          
          // Default admin check based on email
          if (currentUser.email === 'szi.illes85@gmail.com' && currentUser.emailVerified) {
             role = 'admin';
          }

          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              role: role
            });
            setIsAdmin(role === 'admin');
          } else {
            // Force update role if it's supposed to be admin but isn't in DB
            const existingData = userDoc.data();
            if (role === 'admin' && existingData?.role !== 'admin') {
              await updateDoc(userDocRef, { role: 'admin' });
              setIsAdmin(true);
            } else {
              setIsAdmin(existingData?.role === 'admin');
            }
          }
          
          // Eltávolítva a jogosultsági hibák miatt (már nincs rá szükség a db-ben)
          // if (role === 'admin') {
          //    initializeDefaultData();
          // }

        } catch (error) {
          console.error("Error checking user role:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};