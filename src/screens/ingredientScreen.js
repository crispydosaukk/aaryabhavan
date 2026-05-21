import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  TextField,
  IconButton,
  Tooltip,
  Modal,
  Chip,
  styled,
  alpha,
  Pagination,
  DialogContentText,
  Snackbar,
} from "@mui/material";
import { Edit, Delete, Add, Search, WarningAmber } from "@mui/icons-material";
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "../firebase-config";
import InventoryForm from "../components/inventory-form";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import appTheme from "../theme";
import Collections from "../collections";

const IngredientsScreen = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const itemsPerPage = 10;

  // Styled components
  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    fontWeight: "bold",
    backgroundColor: appTheme.colors.primary,
    color: "white",
    "&.MuiTableCell-body": {
      fontSize: 14,
    },
  }));

  const StyledTableRow = styled(TableRow)(({ theme }) => ({
    "&:nth-of-type(odd)": {
      backgroundColor: alpha(appTheme.colors.pastelCream, 0.5),
    },
    "&:hover": {
      backgroundColor: alpha(appTheme.colors.pastelGreen, 0.2),
    },
  }));

  // Fetch ingredients from Firestore
  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const categorySnapshot = await getDocs(
          collection(db, Collections.INVENTORY_CATEGORY)
        );
        const categoriesData = categorySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error fetching categories: ", error);
      }
    };

    fetchCategories();
    const fetchIngredients = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "ingredients"));
        const ingredientsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setIngredients(ingredientsList);
      } catch (error) {
        console.error("Error fetching ingredients: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIngredients();
  }, []);

  // Filter ingredients based on search term
  const filteredIngredients = useMemo(() => {
    if (!searchTerm) return ingredients;
    const searchLower = searchTerm.toLowerCase();
    return ingredients.filter((ingredient) => {
      return (
        ingredient.title.toLowerCase().includes(searchLower) ||
        (ingredient.brand && ingredient.brand.toLowerCase().includes(searchLower)) ||
        (ingredient.vendor && ingredient.vendor.toLowerCase().includes(searchLower))
      );
    });
  }, [ingredients, searchTerm]);

  // Pagination
  const paginatedIngredients = useMemo(() => {
    return filteredIngredients.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredIngredients, currentPage, itemsPerPage]);

  // Handle delete ingredient
  const handleDelete = async () => {
    if (!ingredientToDelete) return;

    try {
      await deleteDoc(doc(db, "ingredients", ingredientToDelete.id));
      setIngredients(ingredients.filter((ing) => ing.id !== ingredientToDelete.id));
      setSnackbarMessage("Ingredient deleted successfully");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error deleting ingredient: ", error);
      setSnackbarMessage("Error deleting ingredient");
      setSnackbarOpen(true);
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: appTheme.colors.primary }}>
        Ingredients
      </Typography>

      {/* Search and Add Button */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <TextField
          label="Search Ingredients"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search color="action" sx={{ mr: 1 }} />,
          }}
          sx={{
            width: "50%",
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": {
                borderColor: appTheme.colors.primary,
              },
              "&.Mui-focused fieldset": {
                borderColor: appTheme.colors.primary,
              },
            },
          }}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setSelectedIngredient(null);
            setOpenModal(true);
          }}
          sx={{
            backgroundColor: appTheme.colors.primary,
            "&:hover": {
              backgroundColor: alpha(appTheme.colors.primary, 0.8),
            },
            color:'white'
          }}
        >
          Add Ingredient
        </Button>
      </Box>

      {/* Ingredients Table */}
      <Paper elevation={3} sx={{ borderRadius: appTheme.borderRadius.md }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <StyledTableCell>Title</StyledTableCell>
                <StyledTableCell>Brand</StyledTableCell>
                <StyledTableCell>Vendor</StyledTableCell>
                <StyledTableCell>Category</StyledTableCell>
                <StyledTableCell>Units</StyledTableCell>
                <StyledTableCell>Available Qty</StyledTableCell>
                <StyledTableCell>Sold Qty</StyledTableCell>
                <StyledTableCell>Actual Price/unit</StyledTableCell>
                <StyledTableCell>Selling Price/unit</StyledTableCell>
                <StyledTableCell>Actions</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={50} sx={{ color: appTheme.colors.primary }} />
                  </TableCell>
                </TableRow>
              ) : paginatedIngredients.length > 0 ? (
                paginatedIngredients.map((ingredient) => (
                  <StyledTableRow key={ingredient.id}>
                    <TableCell>{ingredient.title}</TableCell>
                    <TableCell>{ingredient.brand}</TableCell>
                    <TableCell>{ingredient.vendor}</TableCell>
                    <TableCell>
                        <Chip
                          label={
                            categories.find(
                              (cat) => cat.id === ingredient.categoryId
                            )?.category || "N/A"
                          }
                          size="small"
                          sx={{
                            backgroundColor: alpha(
                              appTheme.colors.primary,
                              0.1
                            ),
                            color: appTheme.colors.primary,
                            borderRadius: appTheme.borderRadius.sm,
                            fontWeight:'bold'
                          }}
                        />
                      </TableCell>
                    <TableCell>{ingredient.units}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {ingredient.availableQuantity}
                        {ingredient.availableQuantity < 10 && (
                          <Tooltip title="Low stock">
                            <WarningAmber
                              color="warning"
                              fontSize="small"
                              sx={{ ml: 1 }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{ingredient.soldQuantity}</TableCell>
                    <TableCell>£{ingredient.actualPrice}</TableCell>
                    <TableCell>£{ingredient.sellingPrice}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton
                          onClick={() => {
                            setSelectedIngredient(ingredient);
                            setOpenModal(true);
                          }}
                          sx={{ color: appTheme.colors.primary }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => {
                            setIngredientToDelete(ingredient);
                            setDeleteConfirmOpen(true);
                          }}
                          sx={{ color: appTheme.colors.accent }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </StyledTableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1">
                      {searchTerm ? "No matching ingredients found" : "No ingredients available"}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {filteredIngredients.length > itemsPerPage && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <Pagination
              count={Math.ceil(filteredIngredients.length / itemsPerPage)}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      {/* Add/Edit Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: 800,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: appTheme.borderRadius.md,
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <InventoryForm
            editItem={selectedIngredient}
            onSubmitSuccess={() => {
              setOpenModal(false);
              setSelectedIngredient(null);
              setSnackbarMessage(
                selectedIngredient ? "Ingredient updated successfully" : "Ingredient added successfully"
              );
              setSnackbarOpen(true);
              // Refresh the list (in a real app, you might want to update state or refetch)
            }}
            onClose={() => setOpenModal(false)}
          />
        </Box>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this ingredient? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default IngredientsScreen;