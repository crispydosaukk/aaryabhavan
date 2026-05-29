import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase-config";
import html2pdf from "html2pdf.js";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  LinearProgress,
  TextField,
  IconButton,
  Tooltip,
  Typography,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  Chip,
  Stack,
  Divider,
  useMediaQuery,
  InputAdornment,
} from "@mui/material";
import {
  Search,
  Download,
  ChevronRight,
  X,
  ArrowLeft,
  Calendar,
  Building2,
  Mail,
  Receipt,
  CreditCard,
  Printer,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Grid,
} from "lucide-react";
import { Phone, Business } from "@mui/icons-material";
import Header from "../components/header";
import LOGO from "../assets/abLogo.png";
import appTheme from "../theme";
import moment from "moment";

const ConsolidatedInvoiceView = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [consolidatedInvoices, setConsolidatedInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceGroup, setSelectedInvoiceGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [isPrinting, setIsPrinting] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("Weekly");
  const [rawInvoices, setRawInvoices] = useState([]);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const invoiceRef = useRef(null);
  const isMobile = useMediaQuery("(max-width:600px)");

  // Date formatting functions
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return moment(date).format("MMM D, YYYY");
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return moment(date).format("h:mm A");
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return moment(date).format("MMM D, YYYY h:mm A");
  };

  // Toggle period expansion
  const togglePeriodExpansion = (periodKey) => {
    setExpandedPeriods((prev) => ({
      ...prev,
      [periodKey]: !prev[periodKey],
    }));
  };

  // Filter invoices by payment status
  const filteredInvoices = consolidatedInvoices.filter((group) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "paid") return group.paymentStatus === "Paid";
    return group.paymentStatus === "Pending";
  });

  useEffect(() => {
    if (rawInvoices.length > 0) {
      const groupedInvoices = groupInvoicesByPeriod(rawInvoices, periodFilter, customStartDate, customEndDate);
      setConsolidatedInvoices(groupedInvoices);
    } else {
      setConsolidatedInvoices([]);
    }
  }, [rawInvoices, periodFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Reset states when closing modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedInvoiceGroup(null);
  };

  // Reset all selection states
  const handleBackToRestaurants = () => {
    setSelectedRestaurant(null);
    setConsolidatedInvoices([]);
    setSelectedInvoiceGroup(null);
    setShowModal(false);
  };

  const fetchRestaurants = async () => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      const restaurantData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRestaurants(restaurantData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      setLoading(false);
    }
  };

  const fetchInvoices = (restaurantId) => {
    const invoicesRef = collection(db, "invoices");
    const q = query(
      invoicesRef,
      where("userId", "==", restaurantId),
      orderBy("createdAt", "asc")
    );

    // Listen to real-time updates
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const invoices = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRawInvoices(invoices);
        setLoading(false); // Stop loading after data is received
      },
      (error) => {
        console.error("Error fetching invoices:", error);
        setLoading(false); // Stop loading even if there’s an error
      }
    );

    // Return the unsubscribe function for cleanup
    return unsubscribe;
  };

  const groupInvoicesByPeriod = (invoices, filterType = "Weekly", customStart = "", customEnd = "") => {
    const grouped = {};

    invoices.forEach((invoice) => {
      const date = new Date(invoice.createdAt); // Ensure createdAt is a valid date
      let key, label, startDate, endDate;

      if (filterType === "Custom") {
        if (customStart && date < new Date(customStart)) return;
        if (customEnd) {
           const end = new Date(customEnd);
           end.setHours(23, 59, 59, 999);
           if (date > end) return;
        }
        key = "custom";
        label = "Custom Range";
        startDate = customStart ? new Date(customStart) : new Date(0);
        endDate = customEnd ? new Date(customEnd) : new Date();
      } else if (filterType === "Monthly") {
        const year = date.getFullYear();
        const month = date.getMonth();
        key = `monthly-${year}-${month}`;
        label = moment(date).format("MMMM YYYY");
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
      } else { // Weekly default
        const day = date.getDay();
        const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date);
        monday.setDate(diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        key = `weekly-${monday.getTime()}`;
        label = `Weekly (Mon-Sun) - Week of ${moment(monday).format("MMM D, YYYY")}`;
        startDate = monday;
        endDate = sunday;
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: label,
          month: moment(startDate).format("MMMM YYYY"),
          year: startDate.getFullYear(),
          invoices: [],
          totalAmount: 0,
          totalItems: 0,
          startDate,
          endDate,
          isPaid: true, // Initialize as true for payment status
        };
      }

      grouped[key].invoices.push(invoice);

      // Ensure totalPrice is valid and numeric
      const invoiceTotalPrice = parseFloat(invoice.totalPrice) || 0;
      grouped[key].totalAmount += invoiceTotalPrice;

      // Count total items if items exist
      grouped[key].totalItems += invoice.items ? invoice.items.length : 0;

      // Update payment status
      if (!invoice.isBillPaid) {
        grouped[key].isPaid = false;
      }
    });

    // Convert grouped object to array and add paymentStatus
    return Object.values(grouped)
      .map((group) => ({
        ...group,
        paymentStatus: group.isPaid ? "Paid" : "Pending",
      }))
      .sort((a, b) => b.endDate - a.endDate); // Sort by endDate in descending order
  };

  const handleDownloadPDF = async () => {
    setIsPrinting(true);
    try {
      const element = invoiceRef.current;
      if (!element) {
        console.error("Element not found for PDF generation");
        return;
      }
  
      // Temporarily add styles to prevent page breaks inside rows
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          table { page-break-inside:auto !important; }
          tr { page-break-inside:avoid !important; page-break-after:auto !important; }
          thead { display:table-header-group !important; }
          tfoot { display:table-footer-group !important; }
        }
      `;
      document.head.appendChild(style);
  
      const options = {
        margin: 15,
        filename: `invoice-${selectedRestaurant?.restaurantName || 'details'}-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: true,
          // scrollY: 0,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight+element.scrollHeight,
          // letterRendering: true,
          // allowTaint: true,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: 'tr'
        }
      };
  
      // Add small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Generate PDF directly from the original element
      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      // Remove the temporary styles
      const styles = document.querySelectorAll('style[data-pdf-styles]');
      styles.forEach(style => style.remove());
      setIsPrinting(false);
    }
  };

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.restaurantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // const formatDate = (date) => {
  //   return new Date(date).toLocaleDateString("en-GB", {
  //     day: "2-digit",
  //     month: "short",
  //     year: "numeric",
  //   });
  // };

  const renderEachInvoices = (invoice) => {
    let count = 0;

    // Iterate through the items array and accumulate the quantity, ensuring it's treated as a number
    invoice.items.forEach((item) => {
      count += Number(item?.quantity) || 0; // Convert quantity to a number, fallback to 0 if invalid
    });

    return count;
  };

  const handlePaymentStatusChange = async (newStatus) => {
    setPaymentStatus(newStatus); // Update local state for immediate UI response

    const isPaid = newStatus === "Paid";

    try {
      // Update each invoice record in Firestore
      await Promise.all(
        selectedInvoiceGroup.invoices.map((invoice) => {
          const invoiceDocRef = doc(db, "invoices", invoice.id); // Reference to the Firestore document
          return updateDoc(invoiceDocRef, { isBillPaid: isPaid }); // Update the document
        })
      );

      // Reflect changes in the UI
      setSelectedInvoiceGroup((prev) => ({
        ...prev,
        invoices: prev.invoices.map((invoice) => ({
          ...invoice,
          isBillPaid: isPaid,
        })),
      }));
      console.log(isPaid, "jhuygaddahjbguyi");
    } catch (error) {
      console.error("Error updating payment status: ", error);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fetchInvoices(
      selectedRestaurant?.id ? selectedRestaurant?.id : ""
    );

    // Cleanup on component unmount
    return () => unsubscribe();
  }, [selectedRestaurant]);

  // Rest of your existing functions (fetchRestaurants, fetchInvoices, groupInvoicesByPeriod, etc.)
  // ... [keep all your existing functions unchanged]

  // Enhanced UI Components
  const StatusChip = ({ status }) => (
    <Chip
      label={status}
      sx={{
        backgroundColor:
          status === "Paid"
            ? alpha(appTheme.colors.primary, 0.2)
            : alpha(appTheme.colors.accent, 0.2),
        color:
          status === "Paid" ? appTheme.colors.primary : appTheme.colors.accent,
        fontWeight: 600,
        minWidth: 80,
      }}
    />
  );

  const PaymentStatusDropdown = ({ value, onChange }) => (
    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
      <Select
        value={value}
        onChange={onChange}
        sx={{
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: appTheme.colors.primary,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: appTheme.colors.secondary,
          },
        }}
      >
        <MenuItem value="Pending">
          <StatusChip status="Pending" />
        </MenuItem>
        <MenuItem value="Paid">
          <StatusChip status="Paid" />
        </MenuItem>
      </Select>
    </FormControl>
  );

  return (
    <Box
      sx={{
        backgroundColor: alpha(appTheme.colors.pastelCream, 0.3),
        minHeight: "100vh",
        pb: 3,
        pt: 2,
      }}
    >
      <Box maxWidth="xl" sx={{ mx: "auto", px: isMobile ? 1 : 3 }}>
        <Header title="Consolidated Invoices" />

        {/* Main Content */}
        <Paper
          elevation={2}
          sx={{
            backgroundColor: appTheme.colors.white,
            borderRadius: appTheme.borderRadius.lg,
            overflow: "hidden",
            boxShadow: appTheme.shadows.medium,
            p: 2,
            mb: 3,
          }}
        >
          {!selectedRestaurant ? (
            <>
              {/* Restaurant Selection View */}
              <TextField
                fullWidth
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} color={appTheme.colors.primary} />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: appTheme.borderRadius.md,
                    backgroundColor: appTheme.colors.white,
                    mb: 2,
                  },
                }}
              />

              <TableContainer
                sx={{
                  borderRadius: appTheme.borderRadius.md,
                  border: `1px solid ${alpha(appTheme.colors.primary, 0.1)}`,
                  maxHeight: "60vh",
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow
                      sx={{ backgroundColor: appTheme.colors.pastelGreen }}
                    >
                      <TableCell
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Restaurant
                      </TableCell>
                      <TableCell
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Address
                      </TableCell>
                      <TableCell
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Contact
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRestaurants.map((restaurant) => (
                      <TableRow
                        key={restaurant.id}
                        hover
                        sx={{
                          "&:hover": {
                            backgroundColor: alpha(
                              appTheme.colors.pastelPeach,
                              0.2
                            ),
                          },
                        }}
                      >
                        <TableCell>
                          <Typography fontWeight={600}>
                            {restaurant.restaurantName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {restaurant.address}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack>
                            <Typography variant="body2">
                              <Box
                                component="span"
                                sx={{ color: appTheme.colors.primary, mr: 1 }}
                              >
                                <Phone fontSize="small" />
                              </Box>
                              {restaurant.phone}
                            </Typography>
                            <Typography variant="body2">
                              <Box
                                component="span"
                                sx={{ color: appTheme.colors.primary, mr: 1 }}
                              >
                                <Mail fontSize="small" />
                              </Box>
                              {restaurant.email}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelectedRestaurant(restaurant);
                              fetchInvoices(restaurant.id);
                            }}
                            sx={{
                              borderColor: appTheme.colors.primary,
                              color: appTheme.colors.primary,
                              "&:hover": {
                                backgroundColor: alpha(
                                  appTheme.colors.primary,
                                  0.1
                                ),
                                borderColor: appTheme.colors.primary,
                              },
                            }}
                          >
                            View Invoices
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <>
              {/* Invoice Periods View */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Box>
                  <Button
                    startIcon={<ArrowLeft size={20} />}
                    onClick={handleBackToRestaurants}
                    sx={{
                      color: appTheme.colors.primary,
                      mr: 2,
                    }}
                  >
                    Back
                  </Button>
                  <Typography
                    variant="h6"
                    component="span"
                    sx={{
                      fontWeight: 600,
                      color: appTheme.colors.primary,
                    }}
                  >
                    {selectedRestaurant.restaurantName}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Filter size={18} color={appTheme.colors.primary} />
                  {periodFilter === "Custom" && (
                    <>
                      <TextField
                        type="date"
                        size="small"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        type="date"
                        size="small"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </>
                  )}
                  <Select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    size="small"
                    sx={{
                      minWidth: 120,
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: appTheme.colors.primary },
                    }}
                  >
                    <MenuItem value="Weekly">Weekly (Monday-Sunday)</MenuItem>
                    <MenuItem value="Monthly">Monthly</MenuItem>
                    <MenuItem value="Custom">Custom</MenuItem>
                  </Select>
                  <Select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    size="small"
                    sx={{
                      minWidth: 120,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: appTheme.colors.primary,
                      },
                    }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </Stack>
              </Box>

              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: appTheme.borderRadius.md,
                  border: `1px solid ${alpha(appTheme.colors.primary, 0.1)}`,
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{ backgroundColor: appTheme.colors.pastelGreen }}
                    >
                      <TableCell
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Period
                      </TableCell>
                      <TableCell
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Date Range
                      </TableCell>
                      <TableCell
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Invoices
                      </TableCell>
                      <TableCell
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Items
                      </TableCell>
                      <TableCell
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Amount
                      </TableCell>
                      <TableCell
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Status
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: appTheme.colors.dark, fontWeight: 600 }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredInvoices.map((group) => {
                      const periodKey = `${group.year}-${group.month}-${group.period}`;
                      const isExpanded = expandedPeriods[periodKey];

                      return (
                        <React.Fragment key={periodKey}>
                          <TableRow
                            hover
                            sx={{
                              "&:hover": {
                                backgroundColor: alpha(
                                  appTheme.colors.pastelPeach,
                                  0.2
                                ),
                              },
                            }}
                          >
                            <TableCell>
                              <Typography fontWeight={600}>
                                {group.period}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {formatDate(group.startDate)} -{" "}
                              {formatDate(group.endDate)}
                            </TableCell>
                            <TableCell>{group.invoices.length}</TableCell>
                            <TableCell>{group.totalItems}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                              £{group.totalAmount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <PaymentStatusDropdown
                                value={group.paymentStatus}
                                onChange={(e) =>
                                  handlePaymentStatusChange(e.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="center"
                              >
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedInvoiceGroup(group);
                                      setShowModal(true);
                                    }}
                                    sx={{
                                      color: appTheme.colors.primary,
                                      backgroundColor: alpha(
                                        appTheme.colors.pastelGreen,
                                        0.3
                                      ),
                                      "&:hover": {
                                        backgroundColor: alpha(
                                          appTheme.colors.pastelGreen,
                                          0.5
                                        ),
                                      },
                                    }}
                                  >
                                    <Eye size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip
                                  title={isExpanded ? "Collapse" : "Expand"}
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      togglePeriodExpansion(periodKey)
                                    }
                                    sx={{
                                      color: appTheme.colors.secondary,
                                      backgroundColor: alpha(
                                        appTheme.colors.pastelPeach,
                                        0.3
                                      ),
                                      "&:hover": {
                                        backgroundColor: alpha(
                                          appTheme.colors.pastelPeach,
                                          0.5
                                        ),
                                      },
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp size={16} />
                                    ) : (
                                      <ChevronDown size={16} />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                sx={{
                                  backgroundColor: alpha(
                                    appTheme.colors.pastelCream,
                                    0.5
                                  ),
                                  p: 0,
                                }}
                              >
                                <Box sx={{ p: 2 }}>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ mb: 1 }}
                                  >
                                    Individual Invoices
                                  </Typography>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Invoice #</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Items</TableCell>
                                        <TableCell align="right">
                                          Amount
                                        </TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {group.invoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                          <TableCell>
                                            <Typography variant="body2">
                                              #{invoice.id.slice(0, 8)}...
                                            </Typography>
                                          </TableCell>
                                          <TableCell>
                                            {formatDate(invoice.createdAt)}
                                          </TableCell>
                                          <TableCell>
                                            {invoice.items.reduce((sum, item) => sum + (1 || 0), 0)}
                                          </TableCell>
                                          <TableCell align="right">
                                            <Typography fontWeight={600}>
                                              £{invoice.totalPrice.toFixed(2)}
                                            </Typography>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>

        {/* Invoice Details Modal */}
        <Dialog
          open={showModal}
          onClose={handleCloseModal}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              background:
                "linear-gradient(to bottom right, #c5e1a5, #ffe0b2, #ffcdd2)",
              borderRadius: 2,
            },
          }}
        >
          <DialogContent
            ref={invoiceRef}
            sx={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <div
              style={{
                flexDirection: "row",
                display: "flex",
                justifyContent: "space-between",
                paddingInline: "20px",
              }}
            >
              <DialogTitle
                sx={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  backgroundClip: "text",
                  color: "black",
                  paddingBottom: 4,
                }}
              >
                Invoice
              </DialogTitle>
              <img
                src={LOGO}
                alt="Logo"
                style={{
                  width: "25%",
                  height: "25%",
                  marginRight: "8px",
                  marginTop:'20px'
                }}
              />
            </div>

            {selectedInvoiceGroup && (
              <div style={{ marginBottom: "24px" }}>
                {/* Bill From Section - Enhanced */}
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#2D3748",
                    marginLeft: "10px",
                  }}
                >
                  Bill From:{" "}
                </Typography>
                <Card
                  elevation={0}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 2,
                    marginTop: "5px",
                    marginBottom: "10px",
                  }}
                >
                  <CardContent sx={{ padding: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    <strong>Arya Bhavan - Central Kitchen</strong> <br></br>
                    </Typography>
                    <Typography variant="body1">
              22,22A Ealing Rd, Wembley, HA0 4TL , United Kingdom
                    </Typography>
                  </CardContent>
                </Card>

                {/* Restaurant Info Card - Enhanced */}
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#2D3748",
                    marginLeft: "10px",
                  }}
                >
                  Bill To:{" "}
                </Typography>
                <Card
                  elevation={0}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ padding: 4 }}>
                    <div
                      style={{
                        display: "grid",
                        gap: "24px",
                        gridTemplateColumns: "1fr 1fr",
                      }}
                    >
                      <div>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: "bold", color: "#2D3748" }}
                        >
                          {selectedRestaurant.restaurantName}
                        </Typography>
                        <div style={{ marginTop: "16px" }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#4A5568",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Mail sx={{ color: "#F97316", mr: 1 }} />{" "}
                            {selectedRestaurant.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#4A5568",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Phone sx={{ color: "#F97316", mr: 1 }} />{" "}
                            {selectedRestaurant.phone}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#4A5568",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Business sx={{ color: "#F97316", mr: 1 }} />{" "}
                            {selectedRestaurant.address}
                          </Typography>
                        </div>
                      </div>
                      <div>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#4A5568",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Mail sx={{ color: "#F97316", mr: 1 }} />{" "}
                          {selectedRestaurant.email}
                        </Typography>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "8px",
                          }}
                        >
                          <Calendar sx={{ color: "#F97316" }} />
                          <div>
                            <Typography
                              variant="body2"
                              sx={{ color: "#A0AEC0" }}
                            >
                              Invoice Period
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ color: "#2D3748" }}
                            >
                              {formatDate(selectedInvoiceGroup.startDate)} -{" "}
                              {formatDate(selectedInvoiceGroup.endDate)}
                            </Typography>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "8px",
                          }}
                        >
                          <Receipt sx={{ color: "#F97316" }} />
                          <div>
                            <Typography
                              variant="body2"
                              sx={{ color: "#A0AEC0" }}
                            >
                              Invoice Number
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ color: "#2D3748" }}
                            >
                              ABF-{selectedInvoiceGroup.year}-
                              {selectedInvoiceGroup.month
                                .slice(0, 3)
                                .toUpperCase()}
                              -
                              {selectedInvoiceGroup.period === "1-15"
                                ? "A"
                                : "B"}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedInvoiceGroup && (
                  <Box sx={{ mb: 3, mt: 2, px: 2 }}>
                    <FormControl variant="outlined" sx={{ minWidth: 200 }}>
                      <InputLabel>Payment Status</InputLabel>
                      <Select
                        value={paymentStatus}
                        onChange={(e) =>
                          handlePaymentStatusChange(e.target.value)
                        }
                        label="Payment Status"
                      >
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="Paid">Paid</MenuItem>
                        <MenuItem value="Overdue">Overdue</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {/* Enhanced Invoice Table with More Details */}
                <TableContainer
  component={Paper}
  sx={{
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(10px)",
    borderRadius: 2,
    marginTop: "24px",
    pageBreakInside: "avoid",  // Add this
    breakInside: "avoid",     // Add this for wider browser support
    marginBottom: "24px"      // Add some margin to separate it from other content
  }}
>
  <Table sx={{ 
    '& tr': {
      pageBreakInside: 'avoid',
      pageBreakAfter: 'auto'
    }
  }}>
    <TableHead>
      <TableRow>
        <TableCell>Date</TableCell>
        <TableCell>Invoice #</TableCell>
        <TableCell align="right">Qty</TableCell>
        <TableCell align="right">Amount</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {selectedInvoiceGroup.invoices.map((invoice) => (
        <TableRow key={invoice.id} hover style={{ pageBreakInside: 'avoid' }}>
          <TableCell>{formatDate(invoice.createdAt)}</TableCell>
          <TableCell>{invoice.id.slice(0, 8)}</TableCell>
          <TableCell align="right">
            {invoice.items.reduce((sum, item) => sum + (1 || 0), 0)}
          </TableCell>
          <TableCell align="right">
            <span style={{ fontWeight: "bold", color: "#38A169" }}>
              £{invoice.totalPrice.toFixed(2)}
            </span>
          </TableCell>
        </TableRow>
      ))}
      {/* Total Row - make sure it's always on the same page */}
      <TableRow  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
  <TableCell colSpan={2}>
    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
      Total:
    </Typography>
  </TableCell>
  <TableCell align="right">
    <Typography>
      {selectedInvoiceGroup.invoices.reduce((sum, inv) => 
        sum + inv.items.reduce((s, item) => s + (1 || 0), 0), 0)}
    </Typography>
  </TableCell>
  <TableCell align="right">
    <Typography variant="h6" sx={{ fontWeight: "bold", color: "#38A169" }}>
      £{selectedInvoiceGroup.totalAmount.toFixed(2)}
    </Typography>
  </TableCell>
</TableRow>
    </TableBody>
  </Table>
</TableContainer>
              </div>
            )}

            {/* Modal Actions */}
            {!isPrinting && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "16px",
                  marginTop: "24px",
                }}
              >
                <Tooltip title="Download PDF">
                  <IconButton
                    onClick={handleDownloadPDF}
                    sx={{
                      backgroundColor: "#FEE2E2",
                      "&:hover": { backgroundColor: "#FECACA" },
                      padding: 2,
                    }}
                  >
                    <Download sx={{ color: "#C53030" }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Close">
                  <IconButton
                    onClick={handleCloseModal}
                    sx={{
                      backgroundColor: "#E2E8F0",
                      "&:hover": { backgroundColor: "#CBD5E0" },
                      padding: 2,
                    }}
                  >
                    <X sx={{ color: "#4A5568" }} />
                  </IconButton>
                </Tooltip>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </Box>
  );
};

export default ConsolidatedInvoiceView;
