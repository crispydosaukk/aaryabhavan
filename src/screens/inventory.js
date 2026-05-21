import React, { useState, useEffect } from "react";
import {
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, TableSortLabel, IconButton, CircularProgress, Snackbar, Grid,
  Box, Pagination, MenuItem, Paper, Typography, styled, alpha, Chip,
  Tooltip, InputAdornment, Modal, Collapse
} from "@mui/material";
import {
  collection, onSnapshot, updateDoc, doc, query,
  where, getDocs, deleteDoc
} from "firebase/firestore";
import {
  Delete, Edit, Save, Add, Category, Search,
  WarningAmber, KeyboardArrowDown, KeyboardArrowUp,
  Close, DownloadDoneOutlined
} from "@mui/icons-material";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { db } from "../firebase-config";
import AddCategoryModal from "../components/add-category-modal";
import AddProductModal from "../components/inventory-form";
import Collections from "../collections";
import Header from "../components/header";
import appTheme from "../theme";
import InventoryForm from "../components/inventory-form";
import { useAuth } from "../auth-context";
import exportToExcel from "../utils/exportInventory";
import { DownloadCloud } from "lucide-react";

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [orderBy, setOrderBy] = useState("title");
  const [orderDirection, setOrderDirection] = useState("asc");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [updatedValues, setUpdatedValues] = useState({});
  const [loadingField, setLoadingField] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [initialLoading, setInitialLoading] = useState(false);
  const [totals, setTotals] = useState({
    totalQuantity: 0,
    totalSold: 0,
    totalPrice: 0,
    totalUnitPrice: 0,
  });
  const [categories, setCategories] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [openItemModal, setOpenItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedRows, setExpandedRows] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [inventoryFormOpen, setInventoryFormOpen] = useState(false);
  const { userRole } = useAuth();
  const itemsPerPage = 10;

  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    fontWeight: "bold",
    backgroundColor: "#C70A0A",
    color: "white",
    "&.MuiTableCell-body": {
      fontSize: 14,
    },
  }));

  const StyledTableRow = styled(TableRow)(({ theme }) => ({
    "&:nth-of-type(odd)": {
      backgroundColor: "#FFF8E7",
    },
    "&:hover": {
      backgroundColor: "#FFE4B5",
    },
  }));

  const TotalRow = styled(TableRow)(({ theme }) => ({
    backgroundColor: "#FFB500",
    position: "sticky",
    bottom: 0,
    zIndex: 10,
    "& .MuiTableCell-body": {
      fontWeight: "bold",
      color: "#C70A0A",
    },
  }));

  const ActionButton = styled(Button)(({ theme }) => ({
    margin: theme.spacing(1),
    textTransform: "none",
    fontWeight: "bold",
  }));

  const SearchField = styled(TextField)({
    "& .MuiOutlinedInput-root": {
      "& fieldset": {
        borderColor: "#C70A0A",
      },
      "&:hover fieldset": {
        borderColor: "#FFB500",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#C70A0A",
      },
    },
    "& .MuiInputLabel-root": {
      color: "#C70A0A",
    },
  });
  const handleOpenModal = (item = null) => {
    setSelectedItem(item);
    setOpenItemModal(true);
  };

  const handleCloseModal = () => {
    setOpenItemModal(false);
    setSelectedItem(null);
  };

  const handleSubmitSuccess = (savedItem) => {
    setSnackbarMessage(
      savedItem.id === editingProduct?.id
        ? "Product updated successfully!"
        : "Product created successfully!"
    );
    setSnackbarOpen(true);
    setEditingProduct(null);
    setInventoryFormOpen(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    console.log(`Attempting to delete item with ID: ${itemToDelete.id}`);

    try {
      // Query Firestore for the document with the specific ID
      const inventoryQuery = query(
        collection(db, Collections.INVENTORY_ITEMS),
        where("id", "==", itemToDelete.id) // Ensure you use the correct field here
      );
      const querySnapshot = await getDocs(inventoryQuery);

      // Check if any documents were found
      if (querySnapshot.empty) {
        console.error("No document found with the provided ID");
        setSnackbarMessage("Item not found!");
        setSnackbarOpen(true);
        return;
      }

      // Get the document ID from the query result
      const docId = querySnapshot.docs[0].id;
      const itemRef = doc(db, Collections.INVENTORY_ITEMS, docId);

      // Delete the document
      await deleteDoc(itemRef);
      console.log("Document deleted successfully!");

      // Update local state to remove the deleted item
      setProducts((prevProducts) =>
        prevProducts.filter((product) => product.id !== itemToDelete.id)
      );

      setSnackbarMessage("Item deleted successfully!");
      setSnackbarOpen(true);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting document: ", error);
      setSnackbarMessage("Error deleting item.");
      setSnackbarOpen(true);
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const calculateTotals = (items) => {
    const initialTotals = {
      totalQuantity: 0,
      totalSold: 0,
      totalSellingPrice: 0,
      totalActualPrice: 0,
      totalSellingCost: 0,
      totalActualCost: 0
    };

    if (!items || !Array.isArray(items)) return initialTotals;

    return items.reduce((acc, product) => {
      const availableQuantity = Number(product.availableQuantity) || 0;
      const soldQuantity = Number(product.soldQuantity) || 0;
      const sellingPrice = Number(product.sellingPrice) || 0;
      const actualPrice = Number(product.actualPrice) || 0;

      return {
        totalQuantity: acc.totalQuantity + availableQuantity,
        totalSold: acc.totalSold + soldQuantity,
        totalSellingPrice: acc.totalSellingPrice + sellingPrice,
        totalActualPrice: acc.totalActualPrice + actualPrice,
        totalSellingCost: acc.totalSellingCost + (availableQuantity * sellingPrice),
        totalActualCost: acc.totalActualCost + (availableQuantity * actualPrice)
      };
    }, initialTotals);
  };

  // Then in your useEffect where you calculate totals:
  useEffect(() => {
    setTotals(calculateTotals(products));
  }, [products]);

  useEffect(() => {
    setInitialLoading(true);

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

    const unsubscribe = onSnapshot(
      collection(db, Collections.INVENTORY_ITEMS),
      (snapshot) => {
        const updatedItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(updatedItems);
        calculateTotals(updatedItems);
        setInitialLoading(false);
      },
      (error) => {
        console.error("Error fetching data: ", error);
        setInitialLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getCategoryName = (id) =>
    categories.find((cat) => cat.id === id)?.category || "";

  // Step 1: filter based on searchTerm (reacts to both title and category)
  const filteredProducts = products.filter((product) => {
    const categoryName = getCategoryName(product.categoryId);
    return (
      product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Step 2: sort based on orderBy/orderDirection (reacts to state)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue = a[orderBy];
    let bValue = b[orderBy];

    if (orderBy === "category") {
      aValue = getCategoryName(a.categoryId);
      bValue = getCategoryName(b.categoryId);
    }
    if (typeof aValue === "string") aValue = aValue.toLowerCase();
    if (typeof bValue === "string") bValue = bValue.toLowerCase();

    if (orderDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Step 3: paginate
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const handleSort = (column) => {
    const isAsc = orderBy === column && orderDirection === "asc";
    setOrderBy(column);
    setOrderDirection(isAsc ? "desc" : "asc");
  };

  const handleFieldChange = (itemId, field, value) => {
    setUpdatedValues((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleUpdate = async (itemId, field) => {
    const newValue = updatedValues[itemId]?.[field];
    if (newValue === undefined) return;

    try {
      const inventoryQuery = query(
        collection(db, Collections.INVENTORY_ITEMS),
        where("id", "==", itemId)
      );
      const querySnapshot = await getDocs(inventoryQuery);

      if (querySnapshot.empty) {
        console.error("No document found with the provided UUID");
        return;
      }

      const docId = querySnapshot.docs[0].id;
      const itemRef = doc(db, Collections.INVENTORY_ITEMS, docId);

      setLoadingField(field);

      // Store units as text
      await updateDoc(itemRef, {
        [field]: String(newValue), // Convert to string for units
        updatedAt: new Date(),
      });

      setSnackbarMessage(
        `${field === "availableQuantity"
          ? "Quantity"
          : field === "price"
            ? "Price"
            : field === "units" // Handle units specifically
              ? "Units"
              : ""
        } updated successfully!`
      );
      setSnackbarOpen(true);
      setEditingItemId(null);
      setEditingField(null);
    } catch (err) {
      console.error("Error updating item: ", err);
      setSnackbarMessage("Error updating item. Please try again.");
      setSnackbarOpen(true);
    } finally {
      setLoadingField(null);
    }
  };

  const getInitialValue = (product, field) => {
    return updatedValues[product.id]?.[field] ?? product[field];
  };

  const handlePageChange = (_, newPage) => {
    setCurrentPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box
      sx={{
        color: appTheme.colors.dark,
        padding: appTheme.spacing.md,
        borderRadius: appTheme.borderRadius.md,
      }}
    >
      <Grid
        container
        spacing={1}
        alignItems="center"
      >
        <Grid item xs={12} md={5} margin={1}>
          <TextField
            fullWidth
            label="Search Products by title or category"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <Search
                  color="action"
                  style={{ marginRight: appTheme.spacing.sm }}
                />
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                height: "40px", // Set a specific height (default is usually ~56px)
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
            }}
          />
        </Grid>
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: "flex",
            justifyContent: { xs: "center", md: "flex-end" },
            gap: 2,
          }}
        >
          <Button
            variant="contained"
            onClick={() => exportToExcel()}
            startIcon={<DownloadDoneOutlined />}
            sx={{
              backgroundColor: appTheme.colors.primary,
              color: "white", // Add this line to set the text color to white
              "&:hover": {
                backgroundColor: alpha(appTheme.colors.primary, 0.6),
                color: "white", // Ensure hover state also keeps white text
              },
            }}
          >
            Export Inventory
          </Button>
          <Button
            variant="contained"
            onClick={() => setAddCategoryOpen(true)}
            startIcon={<Add />}
            sx={{
              backgroundColor: appTheme.colors.primary,
              color: "white", // Add this line to set the text color to white
              "&:hover": {
                backgroundColor: alpha(appTheme.colors.primary, 0.8),
                color: "white", // Ensure hover state also keeps white text
              },
            }}
          >
            Add Category
          </Button>

          <Button
            variant="contained"
            onClick={() => setOpenItemModal(true)}
            startIcon={<Add />}
            sx={{
              backgroundColor: appTheme.colors.secondary,
              color: "white", // Add this line to set the text color to white
              "&:hover": {
                backgroundColor: alpha(appTheme.colors.secondary, 0.8),
                color: "white", // Ensure hover state also keeps white text
              },
            }}
          >
            Add Product
          </Button>
        </Grid>
      </Grid>
      <Paper
        elevation={3}
        sx={{
          backgroundColor: appTheme.colors.white,
          borderRadius: appTheme.borderRadius.md,
          overflow: "hidden",
          boxShadow: appTheme.shadows.medium,
        }}
      >
        <TableContainer sx={{ maxHeight: "calc(100vh - 110px)" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "40px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  {/* Column for expand/collapse */}
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "150px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "title"}
                    direction={orderBy === "title" ? orderDirection : "asc"}
                    onClick={() => handleSort("title")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "100px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "brand"}
                    direction={orderBy === "brand" ? orderDirection : "asc"}
                    onClick={() => handleSort("brand")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Brand
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "100px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "vendor"}
                    direction={orderBy === "vendor" ? orderDirection : "asc"}
                    onClick={() => handleSort("vendor")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Vendor
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "150px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "category"}
                    direction={orderBy === "category" ? orderDirection : "asc"}
                    onClick={() => handleSort("category")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Category
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "100px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "units"}
                    direction={orderBy === "units" ? orderDirection : "asc"}
                    onClick={() => handleSort("units")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Units
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "120px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "availableQuantity"}
                    direction={
                      orderBy === "availableQuantity" ? orderDirection : "asc"
                    }
                    onClick={() => handleSort("availableQuantity")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Quantity in stock
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "120px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "actualPrice"}
                    direction={orderBy === "actualPrice" ? orderDirection : "asc"}
                    onClick={() => handleSort("actualPrice")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Actual Price/Unit
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "120px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "price"}
                    direction={orderBy === "price" ? orderDirection : "asc"}
                    onClick={() => handleSort("price")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Selling Price/Unit
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "100px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "soldQuantity"}
                    direction={
                      orderBy === "soldQuantity" ? orderDirection : "asc"
                    }
                    onClick={() => handleSort("soldQuantity")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Stock out
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "100px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "totalSellingCost"}
                    direction={orderBy === "totalSellingCost" ? orderDirection : "asc"}
                    onClick={() => handleSort("totalSellingCost")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Total Actual Cost
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    minWidth: "100px",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "totalActualCost"}
                    direction={orderBy === "totalActualCost" ? orderDirection : "asc"}
                    onClick={() => handleSort("totalActualCost")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Total Selling Cost
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === "updatedAt"}
                    direction={orderBy === "updatedAt" ? orderDirection : "asc"}
                    onClick={() => handleSort("updatedAt")}
                    sx={{
                      "&.MuiTableSortLabel-root": {
                        color: appTheme.colors.white,
                      },
                      "&.MuiTableSortLabel-root.Mui-active": {
                        color: appTheme.colors.white,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: `${appTheme.colors.white} !important`,
                      },
                    }}
                  >
                    Updated At
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{
                    fontWeight: "bold",
                    backgroundColor: appTheme.colors.primary,
                    color: appTheme.colors.white,
                    minWidth: "100px",
                  }}
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHead>

            {initialLoading ? (
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={13}
                    align="center"
                    sx={{ padding: appTheme.spacing.xl }}
                  >
                    <CircularProgress
                      size={50}
                      sx={{ color: appTheme.colors.primary }}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {paginatedProducts.map((product, index) => (
                  <React.Fragment key={product.id}>
                    <TableRow
                      sx={{
                        backgroundColor:
                          index % 2 === 0
                            ? "inherit"
                            : alpha(appTheme.colors.pastelGreen, 0.1),
                        "&:hover": {
                          backgroundColor: alpha(
                            appTheme.colors.pastelGreen,
                            0.2
                          ),
                        },
                      }}
                    >
                      <TableCell>
                        {userRole === "superadmin" && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setExpandedRows((prev) =>
                                prev.includes(product.id)
                                  ? prev.filter((id) => id !== product.id)
                                  : [...prev, product.id]
                              );
                            }}
                            sx={{ color: appTheme.colors.primary }}
                          >
                            {expandedRows.includes(product.id) ? (
                              <KeyboardArrowUp />
                            ) : (
                              <KeyboardArrowDown />
                            )}
                          </IconButton>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {product.title}
                        </Typography>
                      </TableCell>
                      <TableCell>{product.brand}</TableCell>
                      <TableCell>{product.vendor}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            categories.find(
                              (cat) => cat.id === product.categoryId
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
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>{product.units}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: "bold",
                            color:
                              product.availableQuantity < 10
                                ? appTheme.colors.accent
                                : "inherit",
                          }}
                        >
                          {product.availableQuantity}
                          {product.availableQuantity < 10 && (
                            <Tooltip title="Low stock" arrow>
                              <WarningAmber
                                fontSize="small"
                                sx={{
                                  color: appTheme.colors.accent,
                                  ml: 1,
                                  verticalAlign: "middle",
                                }}
                              />
                            </Tooltip>
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          £ {product.actualPrice ? parseFloat(product.actualPrice).toFixed(2) : '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          £ {parseFloat(product.sellingPrice).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {product.soldQuantity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          £ {product.actualPrice && product.availableQuantity
                            ? (product.actualPrice * product.availableQuantity).toFixed(2)
                            : '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          £ {product.sellingPrice && product.availableQuantity
                            ? (product.sellingPrice * product.availableQuantity).toFixed(2)
                            : '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.8rem",
                            color: alpha(appTheme.colors.dark, 0.7),
                          }}
                        >
                          {product.updatedAt
                            ? new Date(product.updatedAt).toLocaleString(
                              "en-GB"
                            )
                            : product.createdAt
                              ? new Date(product.createdAt).toLocaleString(
                                "en-GB"
                              )
                              : "N/A"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title="Edit product">
                            <IconButton
                              onClick={() => {
                                handleOpenModal(product);
                              }}
                              size="small"
                              sx={{
                                color: appTheme.colors.primary,
                                "&:hover": {
                                  backgroundColor: alpha(
                                    appTheme.colors.primary,
                                    0.1
                                  ),
                                },
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete product">
                            <IconButton
                              color="error"
                              onClick={() => {
                                setItemToDelete(product);
                                setDeleteConfirmOpen(true);
                              }}
                              size="small"
                              sx={{
                                color: appTheme.colors.accent,
                                "&:hover": {
                                  backgroundColor: alpha(
                                    appTheme.colors.accent,
                                    0.1
                                  ),
                                },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    {expandedRows.includes(product.id) && (
                      <TableRow
                        sx={{
                          backgroundColor: alpha(
                            appTheme.colors.pastelGreen,
                            0.05
                          ),
                        }}
                      >
                        <TableCell colSpan={13} sx={{ py: 0 }}>
                          <Collapse
                            in={expandedRows.includes(product.id)}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box sx={{ margin: 2 }}>
                              <Typography
                                variant="h6"
                                gutterBottom
                                component="div"
                                sx={{ color: appTheme.colors.primary }}
                              >
                                Ingredients
                              </Typography>
                              {product.ingredients &&
                                product.ingredients.length > 0 ? (
                                <Table size="small" aria-label="ingredients">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Ingredient Name
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Quantity Per Unit
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Total Quantity Used
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Units
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Actual Price
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: "bold" }}>
                                        Selling Price
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {product.ingredients.map((ingredient) => (
                                      <TableRow key={ingredient.id}>
                                        <TableCell component="th" scope="row">
                                          {ingredient.title}
                                        </TableCell>
                                        <TableCell>
                                          {ingredient.quantityPerUnit}
                                        </TableCell>
                                        <TableCell>
                                          {ingredient.totalQuantityUsed}
                                        </TableCell>
                                        <TableCell>
                                          {ingredient.units}
                                        </TableCell>
                                        <TableCell>
                                          £{" "}
                                          {parseFloat(
                                            ingredient.actualPrice
                                          ).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                          £{" "}
                                          {parseFloat(
                                            ingredient.sellingPrice
                                          ).toFixed(2)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: alpha(appTheme.colors.dark, 0.6),
                                    fontStyle: "italic",
                                  }}
                                >
                                  No ingredients for this product
                                </Typography>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                <TableRow sx={{ backgroundColor: appTheme.colors.secondary, position: 'sticky', bottom: 0, zIndex: 10 }}>
                  <TableCell colSpan={6} sx={{ color: appTheme.colors.white, fontWeight: 'bold' }}>
                    Total Inventory
                  </TableCell>
                  <TableCell sx={{ color: appTheme.colors.white, fontWeight: 'bold' }}>
                    {totals.totalQuantity && totals.totalQuantity}
                  </TableCell>
                  <TableCell sx={{ color: appTheme.colors.white, fontWeight: 'bold' }}>
                    £ {totals.totalSellingPrice && totals.totalSellingPrice.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ color: appTheme.colors.white, fontWeight: 'bold' }}>
                    £ {totals.totalActualPrice && totals.totalActualPrice.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ color: appTheme.colors.white, fontWeight: 'bold' }}>
                    {totals.totalSold && totals.totalSold}
                  </TableCell>
                  <TableCell sx={{ color: appTheme.colors.white, fontWeight: 'bold' }}>
                    £ {totals.totalSellingCost && totals.totalSellingCost.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ color: appTheme.colors.white, fontWeight: 'bold' }}>
                    £ {totals.totalActualCost && totals.totalActualCost.toFixed(2)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "fixed",
              bottom: 0,
              left: "45%",
            }}
          >
            <Pagination
              count={Math.ceil(sortedProducts.length / itemsPerPage)}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>

        </TableContainer>
      </Paper>
      <Modal
        open={openItemModal}
        onClose={handleCloseModal}
        aria-labelledby="inventory-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: "800px",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            maxHeight: "100vh",
            overflowY: "auto",
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleCloseModal}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <Close />
          </IconButton>
          <InventoryForm
            editItem={selectedItem}
            onSubmitSuccess={handleSubmitSuccess}
            onClose={handleCloseModal}
          />
        </Box>
      </Modal>
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this item?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>No</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <AddCategoryModal
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default Inventory;
