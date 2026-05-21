import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase-config";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  TextField,
  CircularProgress,
  TableSortLabel,
  TableContainer,
  Paper,
  useMediaQuery,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  TablePagination,
  IconButton,
  Stack,
  Box,
  InputAdornment,
  alpha,
  Typography,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Eye, Trash2, Search, Filter, X } from "lucide-react";
import InvoiceModal from "../components/invoice-modal";
import Header from "../components/header";
import appTheme from "../theme";

const statusColors = {
  pending: '#ff9800',  // Orange
  accepted: '#ffc107', // Amber
  shipped: '#2196f3',  // Blue
  delivered: '#4caf50', // Green
  cancelled: '#f44336'  // Red
};

const paymentStatusColors = {
  paid: '#4caf50',     // Green
  pending: '#ff9800'   // Orange
};

const safeAlpha = (color, opacity) => {
  if (!color) return alpha('#000000', opacity);
  try {
    return alpha(color, opacity);
  } catch (e) {
    console.warn('Invalid color:', color);
    return alpha('#000000', opacity);
  }
};

const InvoiceScreen = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [orderStatusValue, setOrderStatusValue] = useState("");
  const [paymentStatusValue, setPaymentStatusValue] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    orderStatus: null,
    paymentStatus: null,
    cutoffTimeEnabled: null
  });
  const [showFilters, setShowFilters] = useState(false);

  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invoiceData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInvoices(invoiceData);
      setFilteredInvoices(invoiceData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, invoices, searchQuery]);

  const applyFilters = () => {
    let result = [...invoices];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(invoice =>
        invoice.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filters
    if (filters.orderStatus) {
      result = result.filter(invoice => invoice.orderStatus === filters.orderStatus);
    }

    if (filters.paymentStatus) {
      const isPaid = filters.paymentStatus === 'paid';
      result = result.filter(invoice => invoice.isBillPaid === isPaid);
    }

    if (filters.cutoffTimeEnabled !== null) {
      result = result.filter(invoice => invoice.cutoffTimeEnabled === filters.cutoffTimeEnabled);
    }

    setFilteredInvoices(result);
    setPage(0);
  };

  const handleSort = (column) => {
    let direction = "asc";
    if (sortConfig.key === column && sortConfig.direction === "asc") {
      direction = "desc";
    }

    const sorted = [...filteredInvoices].sort((a, b) => {
      if (column === "totalPrice") {
        return direction === "asc"
          ? parseFloat(a[column]) - parseFloat(b[column])
          : parseFloat(b[column]) - parseFloat(a[column]);
      }

      if (column === "createdAt") {
        return direction === "asc"
          ? new Date(a[column]) - new Date(b[column])
          : new Date(b[column]) - new Date(a[column]);
      }

      if (a[column] < b[column]) return direction === "asc" ? -1 : 1;
      if (a[column] > b[column]) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredInvoices(sorted);
    setSortConfig({ key: column, direction });
  };

  const handleOrderStatusChange = async (invoiceId, newStatus) => {
    try {
      const invoiceRef = doc(db, "invoices", invoiceId);
      await updateDoc(invoiceRef, { orderStatus: newStatus });
      setEditingInvoiceId(null);
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const handlePaymentStatusChange = async (invoiceId, isPaid) => {
    try {
      const invoiceRef = doc(db, "invoices", invoiceId);
      await updateDoc(invoiceRef, { isBillPaid: isPaid });
      setEditingInvoiceId(null);
    } catch (error) {
      console.error("Error updating payment status:", error);
    }
  };

  const handleDelete = async () => {
    const updateSoldQuantity = async (item) => {
      const q = query(
        collection(db, "inventoryItems"),
        where("title", "==", item.title),
        where("brand", "==", item.brand)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        const inventoryItem = querySnapshot.docs[0].data();

        await updateDoc(docRef, {
          soldQuantity: Math.max(0, inventoryItem.soldQuantity - item.quantity),
        });
      }
    };

    if (deleteType === "single" && invoiceToDelete) {
      const invoiceDoc = await getDoc(doc(db, "invoices", invoiceToDelete));
      if (invoiceDoc.exists()) {
        const invoice = invoiceDoc.data();
        for (const item of invoice.items) {
          await updateSoldQuantity(item);
        }
      }

      await deleteDoc(doc(db, "invoices", invoiceToDelete));
      setFilteredInvoices((prev) =>
        prev.filter((invoice) => invoice.id !== invoiceToDelete)
      );
    } else if (deleteType === "multiple") {
      for (const id of selectedInvoices) {
        const invoiceDoc = await getDoc(doc(db, "invoices", id));
        if (invoiceDoc.exists()) {
          const invoice = invoiceDoc.data();
          for (const item of invoice.items) {
            await updateSoldQuantity(item);
          }
        }

        await deleteDoc(doc(db, "invoices", id));
      }

      setInvoices((prev) =>
        prev.filter((invoice) => !selectedInvoices.includes(invoice.id))
      );
      setFilteredInvoices((prev) =>
        prev.filter((invoice) => !selectedInvoices.includes(invoice.id))
      );
    }

    setDeleteDialogOpen(false);
    setSelectedInvoices([]);
    setInvoiceToDelete(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toggleSelectInvoice = (id) => {
    setSelectedInvoices((prev) =>
      prev.includes(id)
        ? prev.filter((invoiceId) => invoiceId !== id)
        : [...prev, id]
    );
  };

  const isAllSelected =
    filteredInvoices.length > 0 &&
    selectedInvoices.length === filteredInvoices.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map((invoice) => invoice.id));
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value === "all" ? null : value
    }));
  };

  const clearFilters = () => {
    setFilters({
      orderStatus: null,
      paymentStatus: null,
      cutoffTimeEnabled: null
    });
    setSearchQuery("");
  };

  const getCurrentPageData = () => {
    return filteredInvoices.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  };

  const countItems = (invoice) => {
    return invoice.items.reduce((sum, item) => sum + 1, 0);
  };

  const hasFilters = filters.orderStatus || filters.paymentStatus || filters.cutoffTimeEnabled !== null;

  return (
    <Box sx={{ 
      backgroundColor: safeAlpha(appTheme.colors.pastelCream, 0.3),
      minHeight: "100vh",
      pb: 3,
      pt: 2
    }}>
      <Box maxWidth="xl" sx={{ mx: 'auto', px: isMobile ? 1 : 3 }}>
        <Paper 
          elevation={2} 
          sx={{ 
            backgroundColor: appTheme.colors.white,
            borderRadius: appTheme.borderRadius.lg,
            overflow: "hidden",
            boxShadow: appTheme.shadows.medium,
            p: 2
          }}
        >
          <Stack spacing={3}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <TextField
                placeholder="Search orders..."
                value={searchQuery}
                onChange={handleSearch}
                variant="outlined"
                size="small"
                sx={{ 
                  flex: 1,
                  maxWidth: 400,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: appTheme.borderRadius.md,
                    backgroundColor: appTheme.colors.white,
                    '&:hover fieldset': {
                      borderColor: appTheme.colors.primary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: appTheme.colors.primary,
                      borderWidth: 1
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} color={appTheme.colors.primary} />
                    </InputAdornment>
                  ),
                }}
              />
              
              <Stack direction="row" spacing={1}>
                <Button
                  variant={showFilters ? "contained" : "outlined"}
                  onClick={() => setShowFilters(!showFilters)}
                  startIcon={<Filter size={18} />}
                  sx={{
                    borderColor: appTheme.colors.primary,
                    color: showFilters ? appTheme.colors.white : appTheme.colors.primary,
                    backgroundColor: showFilters ? appTheme.colors.primary : 'transparent',
                    '&:hover': {
                      backgroundColor: showFilters ? safeAlpha(appTheme.colors.primary, 0.9) : safeAlpha(appTheme.colors.pastelGreen, 0.3),
                      borderColor: appTheme.colors.primary
                    },
                    borderRadius: appTheme.borderRadius.md,
                    height: "40px"
                  }}
                >
                  Filters
                </Button>
                
                <Button
                  variant="contained"
                  disabled={selectedInvoices.length === 0}
                  onClick={() => {
                    setDeleteDialogOpen(true);
                    setDeleteType("multiple");
                  }}
                  startIcon={<Trash2 size={18} />}
                  sx={{ 
                    backgroundColor: selectedInvoices.length === 0 ? safeAlpha(appTheme.colors.pastelCream, 0.7) : appTheme.colors.accent,
                    color: selectedInvoices.length === 0 ? appTheme.colors.dark : appTheme.colors.white,
                    height: "40px",
                    minWidth: "120px",
                    borderRadius: appTheme.borderRadius.md,
                    '&:hover': {
                      backgroundColor: selectedInvoices.length === 0 ? safeAlpha(appTheme.colors.pastelCream, 0.7) : '#d41c20',
                    },
                    boxShadow: appTheme.shadows.small
                  }}
                >
                  Delete
                </Button>
              </Stack>
            </Stack>

            {showFilters && (
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  backgroundColor: safeAlpha(appTheme.colors.pastelGreen, 0.1),
                  borderRadius: appTheme.borderRadius.md,
                  border: `1px solid ${safeAlpha(appTheme.colors.primary, 0.1)}`
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Order Status</InputLabel>
                    <Select
                      value={filters.orderStatus || "all"}
                      onChange={(e) => handleFilterChange("orderStatus", e.target.value)}
                      label="Order Status"
                    >
                      <MenuItem value="all">All Statuses</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="accepted">Accepted</MenuItem>
                      <MenuItem value="shipped">Shipped</MenuItem>
                      <MenuItem value="delivered">Delivered</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      value={filters.paymentStatus || "all"}
                      onChange={(e) => handleFilterChange("paymentStatus", e.target.value)}
                      label="Payment Status"
                    >
                      <MenuItem value="all">All Payments</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                    </Select>
                  </FormControl>

                  {/* <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Cutoff Time</InputLabel>
                    <Select
                      value={filters.cutoffTimeEnabled === null ? "all" : filters.cutoffTimeEnabled ? "enabled" : "disabled"}
                      onChange={(e) => handleFilterChange("cutoffTimeEnabled", e.target.value === "all" ? null : e.target.value === "enabled")}
                      label="Cutoff Time"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="enabled">Enabled</MenuItem>
                      <MenuItem value="disabled">Disabled</MenuItem>
                    </Select>
                  </FormControl> */}

                  {hasFilters && (
                    <Button
                      onClick={clearFilters}
                      startIcon={<X size={16} />}
                      sx={{
                        color: appTheme.colors.accent,
                        ml: 'auto'
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Stack>
              </Paper>
            )}

            {hasFilters && (
              <Box>
                <Typography variant="body2" sx={{ color: appTheme.colors.dark, mb: 1 }}>
                  Active filters:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {filters.orderStatus && (
                    <Chip
                      label={`Order Status: ${filters.orderStatus}`}
                      onDelete={() => handleFilterChange("orderStatus", null)}
                      sx={{
                        backgroundColor: safeAlpha(statusColors[filters.orderStatus], 0.2),
                        color: appTheme.colors.dark
                      }}
                    />
                  )}
                  {filters.paymentStatus && (
                    <Chip
                      label={`Payment: ${filters.paymentStatus}`}
                      onDelete={() => handleFilterChange("paymentStatus", null)}
                      sx={{
                        backgroundColor: safeAlpha(paymentStatusColors[filters.paymentStatus], 0.2),
                        color: appTheme.colors.dark
                      }}
                    />
                  )}
                  {filters.cutoffTimeEnabled !== null && (
                    <Chip
                      label={`Cutoff Time: ${filters.cutoffTimeEnabled ? 'Enabled' : 'Disabled'}`}
                      onDelete={() => handleFilterChange("cutoffTimeEnabled", null)}
                      sx={{
                        backgroundColor: safeAlpha(appTheme.colors.secondary, 0.2),
                        color: appTheme.colors.dark
                      }}
                    />
                  )}
                </Stack>
              </Box>
            )}

            {loading ? (
              <Box display="flex" justifyContent="center" padding={4}>
                <CircularProgress sx={{ color: appTheme.colors.primary }} />
              </Box>
            ) : (
              <Box>
                <TableContainer sx={{ 
                  maxHeight: "calc(100vh - 220px)",
                  borderRadius: appTheme.borderRadius.md,
                  border: `1px solid ${safeAlpha(appTheme.colors.primary, 0.1)}`,
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: safeAlpha(appTheme.colors.primary, 0.3),
                    borderRadius: '4px'
                  }
                }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          padding="checkbox"
                          sx={{ 
                            backgroundColor: appTheme.colors.pastelGreen,
                            borderBottom: `2px solid ${appTheme.colors.primary}`
                          }}
                        >
                          <Checkbox
                            checked={isAllSelected}
                            onChange={toggleSelectAll}
                            indeterminate={
                              selectedInvoices.length > 0 && !isAllSelected
                            }
                            sx={{
                              color: appTheme.colors.primary,
                              '&.Mui-checked': {
                                color: appTheme.colors.primary,
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ 
                          backgroundColor: appTheme.colors.pastelGreen,
                          color: appTheme.colors.dark,
                          fontWeight: "bold",
                          borderBottom: `2px solid ${appTheme.colors.primary}`
                        }}>
                          <TableSortLabel
                            active={sortConfig.key === "id"}
                            direction={
                              sortConfig.key === "id" ? sortConfig.direction : "asc"
                            }
                            onClick={() => handleSort("id")}
                          >
                            Order ID
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ 
                          backgroundColor: appTheme.colors.pastelGreen,
                          color: appTheme.colors.dark,
                          fontWeight: "bold",
                          borderBottom: `2px solid ${appTheme.colors.primary}`
                        }}>
                          Customer
                        </TableCell>
                        <TableCell sx={{ 
                          backgroundColor: appTheme.colors.pastelGreen,
                          color: appTheme.colors.dark,
                          fontWeight: "bold",
                          borderBottom: `2px solid ${appTheme.colors.primary}`
                        }}>
                          Restaurant
                        </TableCell>
                        <TableCell sx={{ 
                          backgroundColor: appTheme.colors.pastelGreen,
                          color: appTheme.colors.dark,
                          fontWeight: "bold",
                          borderBottom: `2px solid ${appTheme.colors.primary}`
                        }}>
                          Items
                        </TableCell>
                        <TableCell sx={{ 
                          backgroundColor: appTheme.colors.pastelGreen,
                          color: appTheme.colors.dark,
                          fontWeight: "bold",
                          borderBottom: `2px solid ${appTheme.colors.primary}`
                        }}>
                          <TableSortLabel
                            active={sortConfig.key === "totalPrice"}
                            direction={
                              sortConfig.key === "totalPrice"
                                ? sortConfig.direction
                                : "asc"
                            }
                            onClick={() => handleSort("totalPrice")}
                          >
                            Total
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ 
                          backgroundColor: appTheme.colors.pastelGreen,
                          color: appTheme.colors.dark,
                          fontWeight: "bold",
                          borderBottom: `2px solid ${appTheme.colors.primary}`
                        }}>
                          <TableSortLabel
                            active={sortConfig.key === "createdAt"}
                            direction={
                              sortConfig.key === "createdAt"
                                ? sortConfig.direction
                                : "asc"
                            }
                            onClick={() => handleSort("createdAt")}
                          >
                            Date
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ 
                          backgroundColor: appTheme.colors.pastelGreen,
                          color: appTheme.colors.dark,
                          fontWeight: "bold",
                          borderBottom: `2px solid ${appTheme.colors.primary}`
                        }}>
                          Order Status
                        </TableCell>
                        <TableCell sx={{ 
                          backgroundColor: appTheme.colors.pastelGreen,
                          color: appTheme.colors.dark,
                          fontWeight: "bold",
                          borderBottom: `2px solid ${appTheme.colors.primary}`
                        }}>
                          Payment
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ 
                            backgroundColor: appTheme.colors.pastelGreen,
                            color: appTheme.colors.dark,
                            fontWeight: "bold",
                            borderBottom: `2px solid ${appTheme.colors.primary}`
                          }}
                        >
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getCurrentPageData().map((invoice, index) => (
                        <TableRow 
                          key={invoice.id} 
                          hover
                          sx={{ 
                            backgroundColor: index % 2 === 0 ? appTheme.colors.white : safeAlpha(appTheme.colors.pastelGreen, 0.1),
                            '&:hover': {
                              backgroundColor: safeAlpha(appTheme.colors.pastelPeach, 0.2),
                            }
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedInvoices.includes(invoice.id)}
                              onChange={() => toggleSelectInvoice(invoice.id)}
                              sx={{
                                color: appTheme.colors.primary,
                                '&.Mui-checked': {
                                  color: appTheme.colors.primary,
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>
                            <Tooltip title={invoice.id} placement="top">
                              <span>{`#${invoice.id.slice(0, 6)}...`}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="500">{invoice.name}</Typography>
                              <Typography variant="caption" color="textSecondary">{invoice.email}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{invoice.restaurantName}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${countItems(invoice)} items`} 
                              size="small"
                              sx={{
                                backgroundColor: safeAlpha(appTheme.colors.primary, 0.1),
                                color: appTheme.colors.dark
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>£ {invoice.totalPrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <Tooltip title={new Date(invoice.createdAt).toLocaleString()}>
                              <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {editingInvoiceId === invoice.id ? (
                              <Select
                                value={orderStatusValue || invoice.orderStatus}
                                onChange={(e) =>
                                  handleOrderStatusChange(
                                    invoice.id,
                                    e.target.value
                                  )
                                }
                                onBlur={() => setEditingInvoiceId(null)}
                                size="small"
                                fullWidth
                                sx={{
                                  borderRadius: appTheme.borderRadius.md,
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: appTheme.colors.primary,
                                  },
                                }}
                              >
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="accepted">Accepted</MenuItem>
                                <MenuItem value="shipped">Shipped</MenuItem>
                                <MenuItem value="delivered">Delivered</MenuItem>
                              </Select>
                            ) : (
                              <Chip
                                label={invoice.orderStatus}
                                sx={{
                                  backgroundColor: safeAlpha(statusColors[invoice.orderStatus], 0.2),
                                  color: statusColors[invoice.orderStatus],
                                  fontWeight: 'bold',
                                  textTransform: 'capitalize',
                                  cursor: 'pointer',
                                  minWidth: '100px'
                                }}
                                onClick={() => setEditingInvoiceId(invoice.id)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {editingInvoiceId === invoice.id ? (
                              <Select
                                value={
                                  paymentStatusValue ||
                                  (invoice.isBillPaid ? "paid" : "pending")
                                }
                                onChange={(e) =>
                                  handlePaymentStatusChange(
                                    invoice.id,
                                    e.target.value === "paid"
                                  )
                                }
                                onBlur={() => setEditingInvoiceId(null)}
                                size="small"
                                fullWidth
                                sx={{
                                  borderRadius: appTheme.borderRadius.md,
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: appTheme.colors.primary,
                                  },
                                }}
                              >
                                <MenuItem value="paid">Paid</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                              </Select>
                            ) : (
                              <Chip
                                label={invoice.isBillPaid ? "Paid" : "Pending"}
                                sx={{
                                  backgroundColor: safeAlpha(paymentStatusColors[invoice.isBillPaid ? 'paid' : 'pending'], 0.2),
                                  color: paymentStatusColors[invoice.isBillPaid ? 'paid' : 'pending'],
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  minWidth: '80px'
                                }}
                                onClick={() => setEditingInvoiceId(invoice.id)}
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="center"
                            >
                              <Tooltip title="View Details">
                                <IconButton
                                  sx={{ 
                                    color: appTheme.colors.primary,
                                    backgroundColor: safeAlpha(appTheme.colors.pastelGreen, 0.2),
                                    '&:hover': {
                                      backgroundColor: safeAlpha(appTheme.colors.pastelGreen, 0.4),
                                    }
                                  }}
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setIsModalOpen(true);
                                  }}
                                >
                                  <Eye size={18} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Order">
                                <IconButton
                                  sx={{ 
                                    color: appTheme.colors.accent,
                                    backgroundColor: safeAlpha(appTheme.colors.pastelPink, 0.2),
                                    '&:hover': {
                                      backgroundColor: safeAlpha(appTheme.colors.pastelPink, 0.4),
                                    }
                                  }}
                                  onClick={() => {
                                    setDeleteDialogOpen(true);
                                    setDeleteType("single");
                                    setInvoiceToDelete(invoice.id);
                                  }}
                                >
                                  <Trash2 size={18} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={filteredInvoices.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 30, 50, 100]}
                  sx={{
                    position: "sticky",
                    bottom: 0,
                    backgroundColor: safeAlpha(appTheme.colors.pastelGreen, 0.1),
                    borderTop: `1px solid ${safeAlpha(appTheme.colors.primary, 0.1)}`,
                    '.MuiTablePagination-selectIcon': {
                      color: appTheme.colors.primary
                    },
                    '& .MuiButtonBase-root': {
                      color: appTheme.colors.primary
                    }
                  }}
                />
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: appTheme.borderRadius.lg,
              padding: 1,
              boxShadow: appTheme.shadows.large,
              minWidth: '400px'
            },
          }}
        >
          <DialogTitle sx={{ 
            color: appTheme.colors.primary,
            fontWeight: "bold",
            pb: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Trash2 size={20} style={{ marginRight: '8px' }} />
            Confirm Delete
          </DialogTitle>
          <DialogContent sx={{ 
            backgroundColor: safeAlpha(appTheme.colors.pastelCream, 0.3),
            py: 3
          }}>
            <Typography variant="body1">
              {deleteType === "multiple" 
                ? `Are you sure you want to delete ${selectedInvoices.length} selected orders? This action cannot be undone.`
                : "Are you sure you want to delete this order? This action cannot be undone."}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)} 
              sx={{ 
                color: appTheme.colors.dark,
                borderRadius: appTheme.borderRadius.md,
                '&:hover': {
                  backgroundColor: safeAlpha(appTheme.colors.pastelCream, 0.5),
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete} 
              variant="contained" 
              sx={{ 
                backgroundColor: appTheme.colors.accent,
                color: appTheme.colors.white,
                borderRadius: appTheme.borderRadius.md,
                '&:hover': {
                  backgroundColor: '#d41c20',
                },
                boxShadow: appTheme.shadows.small
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {selectedInvoice && (
          <InvoiceModal
            invoice={selectedInvoice}
            handleClose={() => {
              setSelectedInvoice(null);
              setIsModalOpen(false);
            }}
            isModalOpen={isModalOpen}
          />
        )}
      </Box>
    </Box>
  );
};

export default InvoiceScreen;
