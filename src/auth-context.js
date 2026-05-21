import React, { createContext, useState, useEffect, useContext } from 'react';

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // Added to store full user data
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        setIsAuthenticated(true);
        setUserRole(user.role);
        setCurrentUser(user); // Store the full user object
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (userData) => {
    try {
      // Store all user data, not just username and role
      const user = {
        username: userData.username,
        role: userData.role,
        id: userData.id // Include the document ID if available
      };
      
      setIsAuthenticated(true);
      setUserRole(userData.role);
      setCurrentUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Return success to allow navigation
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
    localStorage.removeItem('user');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        userRole, 
        currentUser, // Provide access to full user data
        login, 
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};