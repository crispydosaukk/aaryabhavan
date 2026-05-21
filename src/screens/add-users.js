import React, { useState } from "react";
import {
  TextField,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  useMediaQuery,
  Box,
  Typography,
  Paper,
  Container,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  or,
} from "firebase/firestore";
import { db } from "../firebase-config";
import Collections from "../collections";
import LOGO from "../assets/abLogo.png";
import Header from "../components/header";
import appTheme from "../theme";

const AddUsers = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    restaurantName: "",
    address: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Regular expression to validate UK phone number
  const isValidUKPhone = (phone) => {
    const ukPhoneRegex = /^(\+44\s?7\d{3}|\(?07\d{3}\)?|\d{5}|\d{4})\s?\d{3,4}\s?\d{3,4}$/;
    return ukPhoneRegex.test(phone);
  };
  
  const isMobile = useMediaQuery("(max-width:600px)");

  const validateForm = () => {
    let formErrors = {};

    if (!formData.name) formErrors.name = "Name is required";
    if (!formData.email) formErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      formErrors.email = "Email is invalid";

    if (!formData.phone) formErrors.phone = "Phone number is required";
    else if (!isValidUKPhone(formData.phone))
      formErrors.phone = "Invalid UK phone number format";

    if (!formData.password) formErrors.password = "Password is required";
    if (!formData.confirmPassword)
      formErrors.confirmPassword = "Confirm password is required";
    else if (formData.password !== formData.confirmPassword)
      formErrors.confirmPassword = "Passwords do not match";

    if (!formData.restaurantName)
      formErrors.restaurantName = "Restaurant name is required";
    if (!formData.address) formErrors.address = "Address is required";
    return formErrors;
  };

  // Check if a user with the same email or phone already exists
  const checkIfUserExists = async (email, phone) => {
    const q = query(
      collection(db, Collections.USERS),
      or(where("email", "==", email), where("phone", "==", phone))
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // returns true if user exists
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
    } else {
      setErrors({});
      setLoading(true);

      try {
        const userExists = await checkIfUserExists(
          formData.email,
          formData.phone
        );
        if (userExists) {
          setToast({
            open: true,
            message: "User with the same email or phone already exists",
            severity: "error",
          });
          setLoading(false);
          return;
        }

        const newUser = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          restaurantName: formData.restaurantName,
          address: formData.address,
          createdAt: new Date().toISOString(),
        };

        // Generate a reference with a random ID for the document
        const newDocRef = doc(collection(db, Collections.USERS));
        await setDoc(newDocRef, { ...newUser, id: newDocRef.id });

        // Clear form after successful submission
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          restaurantName: "",
          address: "",
        });

        // Show success message
        setToast({
          open: true,
          message: "User added successfully!",
          severity: "success",
        });
      } catch (error) {
        console.error("Error adding user: ", error);
        setToast({
          open: true,
          message: "Failed to add user",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Create a theme instance with our custom theme colors
  const theme = createTheme({
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
      },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            marginBottom: appTheme.spacing.sm,
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": {
                borderColor: appTheme.colors.primary,
              },
              "&.Mui-focused fieldset": {
                borderColor: appTheme.colors.primary,
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: appTheme.colors.primary,
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: appTheme.borderRadius.md,
            boxShadow: appTheme.shadows.medium,
            "&:hover": {
              boxShadow: appTheme.shadows.large,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: appTheme.borderRadius.lg,
            boxShadow: appTheme.shadows.medium,
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <Box>
        {/* <Header title="Add User" /> */}
        <Container maxWidth="lg">
          <Paper 
            elevation={3}
            sx={{
              p: isMobile ? 2 : 4,
              mt: isMobile ? 2 : 4,
              mb: isMobile ? 2 : 4,
              borderRadius: appTheme.borderRadius.lg,
              backgroundColor: appTheme.colors.white,
              boxShadow: appTheme.shadows.medium,
            }}
          >
            <Typography 
              variant="h4" 
              component="h1" 
              align="center" 
              sx={{
                mb: 4,
                color: appTheme.colors.primary,
                fontWeight: "bold",
              }}
            >
              Add New User
            </Typography>
            
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name}
                    variant="outlined"
                    InputProps={{
                      sx: { borderRadius: appTheme.borderRadius.md },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email}
                    variant="outlined"
                    InputProps={{
                      sx: { borderRadius: appTheme.borderRadius.md },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone (UK)"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    fullWidth
                    error={!!errors.phone}
                    helperText={errors.phone}
                    variant="outlined"
                    InputProps={{
                      sx: { borderRadius: appTheme.borderRadius.md },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Restaurant Name"
                    name="restaurantName"
                    value={formData.restaurantName}
                    onChange={handleChange}
                    fullWidth
                    error={!!errors.restaurantName}
                    helperText={errors.restaurantName}
                    variant="outlined"
                    InputProps={{
                      sx: { borderRadius: appTheme.borderRadius.md },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    fullWidth
                    error={!!errors.password}
                    helperText={errors.password}
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: appTheme.colors.primary }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: { borderRadius: appTheme.borderRadius.md },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Confirm Password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    fullWidth
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            edge="end"
                            sx={{ color: appTheme.colors.primary }}
                          >
                            {showConfirmPassword ? (
                              <VisibilityOff />
                            ) : (
                              <Visibility />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: { borderRadius: appTheme.borderRadius.md },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    fullWidth
                    error={!!errors.address}
                    helperText={errors.address}
                    variant="outlined"
                    multiline
                    rows={2}
                    InputProps={{
                      sx: { borderRadius: appTheme.borderRadius.md },
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ textAlign: "center", mt: 4 }}>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  sx={{
                    width: "175px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                    fontSize: "16px",
                    py: 1.5,
                    "&:hover": {
                      backgroundColor: appTheme.colors.secondary,
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: appTheme.colors.white }} />
                  ) : (
                    "Add User"
                  )}
                </Button>
              </Box>
            </form>
          </Paper>
        </Container>

        {/* Toast Notification */}
        <Snackbar
          open={toast.open}
          autoHideDuration={6000}
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToast({ ...toast, open: false })}
            severity={toast.severity}
            sx={{ 
              width: "100%",
              borderRadius: appTheme.borderRadius.md,
              boxShadow: appTheme.shadows.medium,
              "& .MuiAlert-icon": {
                fontSize: "1.25rem",
              },
            }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default AddUsers;