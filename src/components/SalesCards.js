import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Paper,
  Divider,
  Grid,
  LinearProgress,
  useTheme,
  TextField
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase-config"; // Adjust path to your Firebase config
import dayjs from "dayjs";
import AttachMoneyIcon from "@mui/icons-material/CurrencyPound";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import appTheme from "../theme";

const SalesCards = () => {
  const theme = useTheme();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    return `${year}-${month}`;
  });
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
  });
  const [dailyStats, setDailyStats] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
  });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Invoices from Firestore
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const invoicesRef = collection(db, "invoices");
        const snapshot = await getDocs(invoicesRef);
        const fetchedInvoices = snapshot.docs.map((doc) => doc.data());
        setInvoices(fetchedInvoices);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Process Monthly Sales Data
  // Process Monthly Sales Data
  useEffect(() => {
    const monthData = invoices.filter(
      (invoice) => dayjs(invoice.createdAt).format("YYYY-MM") === selectedMonth
    );

    // Calculate the total by summing each item's price × quantity
    const total = monthData.reduce((sum, invoice) => {
      const invoiceTotal = invoice.items.reduce(
        (itemSum, item) => itemSum + (item.price * item.quantity || 0),
        0
      );
      return sum + invoiceTotal;
    }, 0);

    // Use isBillPaid instead of orderStatus to match parent component
    const paid = monthData
      .filter((invoice) => invoice.isBillPaid)
      .reduce((sum, invoice) => {
        const invoiceTotal = invoice.items.reduce(
          (itemSum, item) => itemSum + (item.price * item.quantity || 0),
          0
        );
        return sum + invoiceTotal;
      }, 0);

    const unpaid = total - paid;

    setMonthlyStats({ total, paid, unpaid });
  }, [selectedMonth, invoices]);

  // Process Daily Sales Data - apply the same changes
  useEffect(() => {
    const dayString = selectedDate.format("YYYY-MM-DD");
    const dayData = invoices.filter(
      (invoice) => dayjs(invoice.createdAt).format("YYYY-MM-DD") === dayString
    );

    // Calculate the total by summing each item's price × quantity
    const total = dayData.reduce((sum, invoice) => {
      const invoiceTotal = invoice.items.reduce(
        (itemSum, item) => itemSum + (item.price * item.quantity || 0),
        0
      );
      return sum + invoiceTotal;
    }, 0);

    // Use isBillPaid instead of orderStatus to match parent component
    const paid = dayData
      .filter((invoice) => invoice.isBillPaid)
      .reduce((sum, invoice) => {
        const invoiceTotal = invoice.items.reduce(
          (itemSum, item) => itemSum + (item.price * item.quantity || 0),
          0
        );
        return sum + invoiceTotal;
      }, 0);

    const unpaid = total - paid;

    setDailyStats({ total, paid, unpaid });
  }, [selectedDate, invoices]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate percentage for progress bars
  const getPaymentPercentage = (paid, total) => {
    if (total === 0) return 0;
    return (paid / total) * 100;
  };

  const generateMonthOptions = () => {
    const options = [];
    const startDate = dayjs("2024-12-01"); // December 2024
    const currentDate = dayjs();

    let month = startDate;
    while (month.isBefore(currentDate) || month.isSame(currentDate, "month")) {
      const monthValue = month.format("YYYY-MM");
      options.push(
        <MenuItem key={monthValue} value={monthValue}>
          {month.format("MMMM YYYY")}
        </MenuItem>
      );
      month = month.add(1, "month");
    }

    return options;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 2 }}>
        {loading && <LinearProgress />}

        <Grid container spacing={3}>
          {/* Monthly Sales Trends */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                height: "100%",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardHeader
                title="Monthly Sales Trends"
                titleTypographyProps={{ variant: "h6", fontWeight: "bold" }}
                avatar={
                  <CalendarTodayIcon
                    color={theme.palette.primary.contrastText}
                  />
                }
                sx={{
                  bgcolor: appTheme.colors.secondary,
                  color: theme.palette.primary.contrastText,
                  pb: 1,
                }}
              />
              <CardContent>
                <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    label="Month"
                  >
                    {generateMonthOptions()}
                  </Select>
                </FormControl>

                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    color="primary"
                  >
                    Total Revenue: {formatCurrency(monthlyStats.total)}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2">Paid</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(monthlyStats.paid)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getPaymentPercentage(
                        monthlyStats.paid,
                        monthlyStats.total
                      )}
                      color="success"
                      sx={{ height: 8, borderRadius: 5, mb: 1.5 }}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2">Unpaid</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(monthlyStats.unpaid)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getPaymentPercentage(
                        monthlyStats.unpaid,
                        monthlyStats.total
                      )}
                      color="warning"
                      sx={{ height: 8, borderRadius: 5 }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Paper>
          </Grid>

          {/* Daily Sales Trends */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                height: "100%",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardHeader
                title="Daily Sales Trends"
                titleTypographyProps={{ variant: "h6", fontWeight: "bold" }}
                avatar={
                  <AttachMoneyIcon color={theme.palette.primary.contrastText} />
                }
                sx={{
                  bgcolor: appTheme.colors.secondary,
                  color: theme.palette.primary.contrastText,
                  pb: 1,
                }}
              />
              <CardContent>
                <TextField
                  label="Select Date"
                  type="date"
                  value={selectedDate.format('YYYY-MM-DD')}
                  onChange={(e) => setSelectedDate(dayjs(e.target.value))}
                  fullWidth
                  variant="outlined"
                  margin="normal"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{ mb: 3 }}
                />


                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    color="primary"
                  >
                    Total Revenue: {formatCurrency(dailyStats.total)}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2">Paid</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(dailyStats.paid)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getPaymentPercentage(
                        dailyStats.paid,
                        dailyStats.total
                      )}
                      color="success"
                      sx={{ height: 8, borderRadius: 5, mb: 1.5 }}
                    />

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2">Unpaid</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(dailyStats.unpaid)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getPaymentPercentage(
                        dailyStats.unpaid,
                        dailyStats.total
                      )}
                      color="warning"
                      sx={{ height: 8, borderRadius: 5 }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default SalesCards;
