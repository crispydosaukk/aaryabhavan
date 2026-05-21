import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../auth-context';
import LOGO from "../assets/abLogo.png";
import {
  TextField,
  Button,
  Container,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  ThemeProvider,
  createTheme,
  Paper,
  Typography
} from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import appTheme from '../theme';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase-config'; // Make sure you have this configured

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Create Material UI theme based on app theme
  const materialTheme = createTheme({
    palette: {
      primary: {
        main: appTheme.colors.primary,
      },
      secondary: {
        main: appTheme.colors.secondary,
      },
      error: {
        main: appTheme.colors.accent,
      },
      background: {
        default: appTheme.colors.white,
        paper: appTheme.colors.pastelCream,
      },
    },
    shape: {
      borderRadius: parseInt(appTheme.borderRadius.md),
    },
  });

  // Script to add initial admin users (run once)
  useEffect(() => {
    const addInitialAdminUsers = async () => {
      try {
        const usersCollection = collection(db, 'adminUsers');
        const snapshot = await getDocs(usersCollection);
        
        // Only add initial users if the collection is empty
        if (snapshot.empty) {
          const initialUsers = [
            { username: 'admin', password: 'admin123', role: 'admin' },
            { username: 'superadmin', password: 'superadmin123', role: 'superadmin' },
            { username: 'user', password: 'user123', role: 'user' }
          ];
          
          for (const user of initialUsers) {
            await addDoc(usersCollection, user);
          }
          console.log('Initial admin users added to Firestore');
        }
      } catch (error) {
        console.error('Error adding initial admin users:', error);
      }
    };

    // Uncomment this line to run the script once
    // addInitialAdminUsers();
    // After running once, comment it back to prevent duplicate entries
  }, []);

  const handleLogin = async () => {
    setError('');
  
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
  
    setLoading(true);
  
    try {
      const usersCollection = collection(db, 'adminUsers');
      const q = query(
        usersCollection, 
        where('username', '==', username.trim()),
        where('password', '==', password.trim())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const userId = querySnapshot.docs[0].id; // Get the document ID
        
        if (userData.role === 'admin' || userData.role === 'superadmin') {
          // Call login and wait for it to complete
          const loginSuccess = await login({ 
            username: userData.username, 
            role: userData.role,
            id: userId // Pass the document ID
          });
          
          if (loginSuccess) {
            navigate('/dashboard');
          } else {
            setError('Login failed. Please try again.');
          }
        } else {
          setError('Access denied. Contact Admin for permission.');
        }
      } else {
        setError('Incorrect username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={materialTheme}>
      <Container maxWidth="sm" sx={{ marginTop: appTheme.spacing.xl, height: '100vh' }}>
        <Paper 
          elevation={3} 
          sx={{ 
            padding: appTheme.spacing.lg,
            backgroundColor: appTheme.colors.white,
            borderRadius: appTheme.borderRadius.md,
            boxShadow: appTheme.shadows.medium,
            border: `1px solid ${appTheme.colors.pastelGreen}`
          }}
        >
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
          >
            {/* Logo and Header */}
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              mb={4}
            >
              <img src={LOGO} alt="Logo" style={{ width: '250px', marginBottom: appTheme.spacing.md }} />
              <Typography 
                variant="h5" 
                sx={{ 
                  color: appTheme.colors.primary, 
                  fontWeight: 'bold',
                  marginBottom: appTheme.spacing.sm 
                }}
              >
                Admin Login
              </Typography>
            </Box>

            {/* Login Form */}
            <TextField
              label="Username"
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              sx={{
                marginBottom: appTheme.spacing.md,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: appTheme.colors.secondary,
                  },
                },
              }}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              sx={{
                marginBottom: appTheme.spacing.md,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: appTheme.colors.secondary,
                  },
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      sx={{ color: appTheme.colors.primary }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  marginTop: appTheme.spacing.md, 
                  width: '100%',
                  backgroundColor: appTheme.colors.pastelPink,
                  color: appTheme.colors.accent
                }}
              >
                {error}
              </Alert>
            )}

            {loading ? (
              <CircularProgress 
                style={{ marginTop: appTheme.spacing.lg }} 
                sx={{ color: appTheme.colors.primary }}
              />
            ) : (
              <Button
                variant="contained"
                fullWidth
                sx={{ 
                  marginTop: appTheme.spacing.lg,
                  backgroundColor: appTheme.colors.primary,
                  '&:hover': {
                    backgroundColor: appTheme.colors.secondary,
                  },
                  padding: appTheme.spacing.sm,
                  fontWeight: 'bold',
                  boxShadow: appTheme.shadows.small
                }}
                onClick={handleLogin}
              >
                Login
              </Button>
            )}
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default LoginScreen;