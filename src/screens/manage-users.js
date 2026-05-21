import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Grid,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  useMediaQuery,
  TableContainer,
  Paper,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  ThemeProvider,
  createTheme,
  InputAdornment,
  alpha
} from "@mui/material";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase-config";
import Collections from "../collections";
import Header from "../components/header";
import { Edit, Save, Cancel, Delete, Search } from "@mui/icons-material";
import appTheme from '../theme';
import { Visibility, VisibilityOff } from "@mui/icons-material";


const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editMode, setEditMode] = useState(null);
  const [editedUser, setEditedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showPasswordIds, setShowPasswordIds] = useState({});

  const isMobile = useMediaQuery("(max-width:600px)");

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
        paper: appTheme.colors.white,
      },
    },
    shape: {
      borderRadius: parseInt(appTheme.borderRadius.md),
    },
  });

  const togglePasswordVisibility = (userId) => {
    setShowPasswordIds((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };
  

  // Fetch all users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersSnapshot = await getDocs(collection(db, Collections.USERS));
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersList);
        setFilteredUsers(usersList);
      } catch (error) {
        console.error("Error fetching users: ", error);
        setToast({
          open: true,
          message: "Error fetching users",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.restaurantName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  // Handle editing logic
  const handleEdit = (user) => {
    setEditMode(user.id);
    setEditedUser({ ...user });
  };

  const handleSave = async (id) => {
    try {
      const userDocRef = doc(db, Collections.USERS, id);
      await updateDoc(userDocRef, editedUser);
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === id ? { ...user, ...editedUser } : user
        )
      );
      setToast({
        open: true,
        message: "User updated successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error updating user: ", error);
      setToast({
        open: true,
        message: "Error updating user",
        severity: "error",
      });
    } finally {
      setEditMode(null);
    }
  };

  const handleCancel = () => {
    setEditMode(null);
    setEditedUser(null);
  };

  const handleChange = (e) => {
    setEditedUser({
      ...editedUser,
      [e.target.name]: e.target.value,
    });
  };

  // Delete functionality
  const openDeleteDialog = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    
    try {
      const userDocRef = doc(db, Collections.USERS, userToDelete.id);
      await deleteDoc(userDocRef);
      
      // Update local state to remove the deleted user
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userToDelete.id));
      setFilteredUsers((prevUsers) => prevUsers.filter((user) => user.id !== userToDelete.id));
      
      setToast({
        open: true,
        message: "User deleted successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error deleting user: ", error);
      setToast({
        open: true,
        message: "Error deleting user",
        severity: "error",
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <ThemeProvider theme={materialTheme}>
      <Box sx={{ bgcolor: appTheme.colors.white, minHeight: "100vh" }}>
        {/* <Header title="Manage Users" /> */}
        <Box sx={{ 
          maxWidth: "95%", 
          margin: "0 auto", 
          paddingTop: isMobile ? appTheme.spacing.md : appTheme.spacing.lg, 
          height: "auto" 
        }}>
          {/* Search and Filters */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: appTheme.spacing.md,
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? appTheme.spacing.sm : 0
            }}
          >
            <Typography 
              variant="h5" 
              sx={{ 
                color: appTheme.colors.primary, 
                fontWeight: 'bold',
                mb: isMobile ? appTheme.spacing.sm : 0
              }}
            >
              User Management
            </Typography>
            <TextField
              placeholder="Search by name, email or restaurant"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ 
                width: isMobile ? '100%' : '300px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: appTheme.borderRadius.md,
                  '&:hover fieldset': {
                    borderColor: appTheme.colors.secondary,
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: appTheme.colors.primary }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: appTheme.spacing.xl }}>
              <CircularProgress sx={{ color: appTheme.colors.primary }} />
            </Box>
          ) : (
            <TableContainer 
              component={Paper} 
              sx={{ 
                boxShadow: appTheme.shadows.medium,
                borderRadius: appTheme.borderRadius.md,
                overflow: 'hidden'
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: appTheme.colors.primary }}>
                    <TableCell sx={{ color: appTheme.colors.white, fontWeight: "bold" }}>Name</TableCell>
                    <TableCell sx={{ color: appTheme.colors.white, fontWeight: "bold" }}>Email</TableCell>
                    <TableCell sx={{ color: appTheme.colors.white, fontWeight: "bold" }}>Phone</TableCell>
                    <TableCell sx={{ color: appTheme.colors.white, fontWeight: "bold" }}>Restaurant</TableCell>
                    {!isMobile && (
                      <TableCell sx={{ color: appTheme.colors.white, fontWeight: "bold" }}>Address</TableCell>
                    )}
                    <TableCell sx={{ color: appTheme.colors.white, fontWeight: "bold" }}>Password</TableCell>
                    <TableCell sx={{ color: appTheme.colors.white, fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isMobile ? 6 : 7} align="center" sx={{ py: appTheme.spacing.lg }}>
                        <Typography variant="body1" sx={{ color: appTheme.colors.dark }}>
                          No users found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <TableRow 
                        key={user.id} 
                        sx={{ 
                          backgroundColor: index % 2 === 0 ? appTheme.colors.white : alpha(appTheme.colors.pastelGreen,0.2),
                          '&:hover': {
                            backgroundColor: appTheme.colors.pastelPeach,
                          }
                        }}
                      >
                        {editMode === user.id ? (
                          <>
                            <TableCell>
                              <TextField
                                name="name"
                                value={editedUser.name || ''}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                name="email"
                                value={editedUser.email || ''}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                name="phone"
                                value={editedUser.phone || ''}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                name="restaurantName"
                                value={editedUser.restaurantName || ''}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                            {!isMobile && (
                              <TableCell>
                                <TextField
                                  name="address"
                                  value={editedUser.address || ''}
                                  onChange={handleChange}
                                  size="small"
                                  fullWidth
                                />
                              </TableCell>
                            )}
                            <TableCell sx={{ color: appTheme.colors.dark }}>
  {user.password ? (
    <>
      {showPasswordIds[user.id] ? user.password : '••••••••'}
      <IconButton
        onClick={() => togglePasswordVisibility(user.id)}
        size="small"
        sx={{ ml: 1 }}
      >
        {showPasswordIds[user.id] ? <VisibilityOff /> : <Visibility />}
      </IconButton>
    </>
  ) : ''}
</TableCell>

                            <TableCell>
                              <IconButton 
                                onClick={() => handleSave(user.id)} 
                                sx={{ color: appTheme.colors.primary }}
                              >
                                <Save />
                              </IconButton>
                              <IconButton 
                                onClick={handleCancel} 
                                sx={{ color: appTheme.colors.accent }}
                              >
                                <Cancel />
                              </IconButton>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell sx={{ color: appTheme.colors.dark }}>{user.name}</TableCell>
                            <TableCell sx={{ color: appTheme.colors.dark }}>{user.email}</TableCell>
                            <TableCell sx={{ color: appTheme.colors.dark }}>{user.phone}</TableCell>
                            <TableCell sx={{ color: appTheme.colors.dark }}>{user.restaurantName}</TableCell>
                            {!isMobile && (
                              <TableCell sx={{ color: appTheme.colors.dark }}>{user.address}</TableCell>
                            )}
                            <TableCell sx={{ color: appTheme.colors.dark, display: 'flex', alignItems: 'center' }}>
  {user.password ? (
    <>
      {showPasswordIds[user.id] ? user.password : '••••••••'}
      <IconButton
        onClick={() => togglePasswordVisibility(user.id)}
        size="small"
        sx={{ ml: 1 }}
      >
        {showPasswordIds[user.id] ? <VisibilityOff /> : <Visibility />}
      </IconButton>
    </>
  ) : ''}
</TableCell>

                            <TableCell>
                              <IconButton 
                                onClick={() => handleEdit(user)} 
                                sx={{ color: appTheme.colors.primary }}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton 
                                onClick={() => openDeleteDialog(user)} 
                                sx={{ color: appTheme.colors.accent }}
                              >
                                <Delete />
                              </IconButton>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            PaperProps={{
              sx: {
                borderRadius: appTheme.borderRadius.md,
                padding: appTheme.spacing.sm
              }
            }}
          >
            <DialogTitle sx={{ color: appTheme.colors.primary, fontWeight: 'bold' }}>
              Confirm Deletion
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete user{' '}
                <Typography component="span" sx={{ fontWeight: 'bold', color: appTheme.colors.dark }}>
                  {userToDelete?.name}
                </Typography>
                ? This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setDeleteDialogOpen(false)}
                sx={{ 
                  color: appTheme.colors.dark,
                  '&:hover': {
                    backgroundColor: appTheme.colors.pastelCream
                  }
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDelete}
                sx={{ 
                  backgroundColor: appTheme.colors.accent,
                  color: appTheme.colors.white,
                  '&:hover': {
                    backgroundColor: '#d32f2f'
                  }
                }}
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          {/* Toast Notification */}
          <Snackbar
            open={toast.open}
            autoHideDuration={5000}
            onClose={() => setToast({ ...toast, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={() => setToast({ ...toast, open: false })}
              severity={toast.severity}
              sx={{ 
                width: '100%',
                borderRadius: appTheme.borderRadius.md,
                backgroundColor: toast.severity === 'success' 
                  ? appTheme.colors.pastelGreen 
                  : appTheme.colors.pastelPink,
                color: toast.severity === 'success' 
                  ? appTheme.colors.primary 
                  : appTheme.colors.accent,
                fontWeight: 'medium'
              }}
            >
              {toast.message}
            </Alert>
          </Snackbar>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default ManageUsers;