import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  CircularProgress,
  Avatar,
  Autocomplete,
  Button,
  Chip,
  Snackbar,
  Alert,
  IconButton as MuiIconButton,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { DataGrid } from '@mui/x-data-grid';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase-config'; // Adjust this import path
import html2pdf from 'html2pdf.js';
import LOGO from '../assets/abLogo.png';

const formatDate = (date) => date.toISOString().split('T')[0];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#CD6155', '#5DADE2'];

const CHIP_COLORS = [
  { bg: '#e3f2fd', text: '#1565c0' },
  { bg: '#e8f5e9', text: '#2e7d32' },
  { bg: '#fff3e0', text: '#e65100' },
  { bg: '#f3e5f5', text: '#7b1fa2' },
  { bg: '#fce4ec', text: '#c62828' },
  { bg: '#e0f2f1', text: '#00695c' },
  { bg: '#ede7f6', text: '#4527a0' },
];

const WasteManagementTab = () => {
  const [loading, setLoading] = useState(true);
  const [wasteItems, setWasteItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [itemsList, setItemsList] = useState([]); // For item filter
  const [filterRestaurant, setFilterRestaurant] = useState('');
  const [filterItem, setFilterItem] = useState(null); // for item filter
  const [filterStartDate, setFilterStartDate] = useState(() => {
    let d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDate(d);
  });
  const [filterEndDate, setFilterEndDate] = useState(() => formatDate(new Date()));
  const [emailSending, setEmailSending] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const wasteGridRef = useRef();

  // Helper to get restaurant name by ID
  const getRestaurantName = (id) => {
    if (!id) return "All Restaurants";
    const rest = restaurants.find(r => r.id === id);
    return rest?.name || id;
  };

  // Fetch waste data from Firestore filtered by date
  useEffect(() => {
    setLoading(true);
    const qBase = collection(db, 'wastage');
    const q = query(qBase, where('date', '>=', filterStartDate), where('date', '<=', filterEndDate), orderBy('date', 'desc'));
    getDocs(q)
      .then(snapshot => {
        let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setWasteItems(items);

        // Extracting unique items for items filter (searchable dropdown)
        const uniqueItemsSet = new Set();
        items.forEach(i => {
          if (i.itemName && typeof i.itemName === "string") uniqueItemsSet.add(i.itemName.trim());
        });
        setItemsList(Array.from(uniqueItemsSet).sort());

        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching waste data:', error);
        setLoading(false);
      });
  }, [filterStartDate, filterEndDate]);

  // Fetch restaurants list from users collection (adjust collection if different)
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const qUsers = collection(db, 'users');
        const snapshot = await getDocs(qUsers);
        const rests = snapshot.docs
          .map(doc => ({
            id: doc.id,
            name: doc.data().restaurantName || doc.data().name || doc.id,
          }));
        setRestaurants(rests);
      } catch (e) {
        console.error('Error fetching restaurants:', e);
      }
    };
    fetchRestaurants();
  }, []);

  // Multi-filtering data by restaurant and item
  const filteredWasteItems = useMemo(() => {
    let filtered = [...wasteItems];
    if (filterRestaurant) filtered = filtered.filter(item => item.userId === filterRestaurant);
    if (filterItem) filtered = filtered.filter(item => (item.itemName && item.itemName.trim() === filterItem));
    return filtered;
  }, [wasteItems, filterRestaurant, filterItem]);

  // Units-aware aggregation: { unit: totalQuantity }
  const wasteQuantityByUnit = useMemo(() => {
    const unitMap = {};
    filteredWasteItems.forEach(item => {
      const qty = parseFloat(item.wastedQuantity) || 0;
      let unit = item.unit || 'pcs';
      unit = typeof unit === 'string' ? unit.trim() : String(unit);
      if (!unitMap[unit]) unitMap[unit] = 0;
      unitMap[unit] += qty;
    });
    return unitMap;
  }, [filteredWasteItems]);

  // Show sum for each unit, normalizing unit case
  const normalizedWasteByUnit = useMemo(() => {
    const unitMap = {};
    Object.entries(wasteQuantityByUnit).forEach(([unit, qty]) => {
      const normUnit = unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
      if (!unitMap[normUnit]) unitMap[normUnit] = 0;
      unitMap[normUnit] += qty;
    });
    return Object.entries(unitMap).map(([unit, qty]) => ({ unit, qty }));
  }, [wasteQuantityByUnit]);

  const totalWasteValue = useMemo(
    () => filteredWasteItems.reduce((sum, item) => sum + (parseFloat(item.estimatedValue) || 0), 0),
    [filteredWasteItems]
  );
  const totalWasteEvents = useMemo(() => filteredWasteItems.length, [filteredWasteItems]);

  // Charts – these should ALSO respect units, so for charts just use sum of all quantities (but label clearly)
  // Or, you can show value-based charts for cross-unit
  const wasteByDate = useMemo(() => {
    const map = {};
    filteredWasteItems.forEach(({ date, wastedQuantity, estimatedValue, unit }) => {
      if (!date) return;
      if (!map[date]) map[date] = { date, byUnit: {}, estimatedValue: 0 };
      const u = (unit || 'pcs').trim();
      map[date].byUnit[u] = (map[date].byUnit[u] || 0) + (parseFloat(wastedQuantity) || 0);
      map[date].estimatedValue += parseFloat(estimatedValue) || 0;
    });
    // Just sum all units for the "wastedQuantity" for chart display; or optionally split by units if needed
    return Object.values(map)
      .map(({ date, byUnit, estimatedValue }) => ({
        date,
        wastedQuantity: Object.values(byUnit).reduce((a, b) => a + b, 0),
        estimatedValue,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredWasteItems]);

  const wasteByReason = useMemo(() => {
    const reasonMap = {};
    filteredWasteItems.forEach(({ reason, wastedQuantity, unit }) => {
      if (!reason) return;
      let u = (unit || 'pcs').trim();
      if (!reasonMap[reason]) reasonMap[reason] = {};
      reasonMap[reason][u] = (reasonMap[reason][u] || 0) + (parseFloat(wastedQuantity) || 0);
    });
    // For pie charting, flatten units by summing, or show reason+unit if units matter
    return Object.entries(reasonMap).map(([reason, unitObj]) => ({
      name: reason,
      value: Object.values(unitObj).reduce((a, b) => a + b, 0), // sum
    }));
  }, [filteredWasteItems]);

  const wasteByRestaurant = useMemo(() => {
    const restMap = {};
    filteredWasteItems.forEach(({ userId, wastedQuantity, unit }) => {
      if (!userId) return;
      let u = (unit || 'pcs').trim();
      if (!restMap[userId]) restMap[userId] = {};
      restMap[userId][u] = (restMap[userId][u] || 0) + (parseFloat(wastedQuantity) || 0);
    });
    // For bar chart, sum all units; or show legend for units if needed
    return Object.entries(restMap).map(([id, unitObj]) => {
      const restaurant = restaurants.find(r => r.id === id)?.name || id;
      return { name: restaurant, quantity: Object.values(unitObj).reduce((a, b) => a + b, 0) };
    });
  }, [filteredWasteItems, restaurants]);

  const wasteByItem = useMemo(() => {
    const itemMap = {};
    filteredWasteItems.forEach(({ itemName, wastedQuantity, unit }) => {
      if (!itemName) return;
      let u = (unit || 'pcs').trim();
      if (!itemMap[itemName]) itemMap[itemName] = {};
      itemMap[itemName][u] = (itemMap[itemName][u] || 0) + (parseFloat(wastedQuantity) || 0);
    });
    const itemsArr = Object.entries(itemMap).map(([name, unitObj]) => ({
      name,
      quantity: Object.values(unitObj).reduce((a, b) => a + b, 0),
    }));
    return itemsArr.sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [filteredWasteItems]);

  const columns = [
    { field: 'date', headerName: 'Date', width: 110 },
    {
      field: 'userId',
      headerName: 'Restaurant',
      width: 150,
      valueGetter: (params) => {
        const rest = restaurants.find(r => r.id === params.value);
        return rest?.name || params.value;
      },
    },
    { field: 'itemName', headerName: 'Item Name', width: 180 },
    { field: 'wastedQuantity', headerName: 'Quantity', width: 100, type: 'number' },
    { field: 'unit', headerName: 'Unit', width: 80 },
    { field: 'reason', headerName: 'Reason', width: 160 },
    { field: 'estimatedValue', headerName: 'Value (£)', width: 110, type: 'number' },
    {
      field: 'imageUrl',
      headerName: 'Image',
      width: 100,
      renderCell: (params) =>
        params.value ? (
          <a href={params.value} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <Avatar variant="square" src={params.value} alt="waste" sx={{ width: 60, height: 40 }} />
          </a>
        ) : (
          <Typography variant="body2" color="textSecondary">No Image</Typography>
        ),
      sortable: false,
      filterable: false,
    },
    { field: 'description', headerName: 'Description', width: 220 },
  ];

  return (
    <>
      <Box p={3} sx={{ backgroundColor: '#fafafa', minHeight: '100vh' }}>
        <Typography variant="h4" gutterBottom>
          Waste Management Dashboard
        </Typography>

        {/* Filters */}
        <Grid container spacing={2} alignItems="flex-end" mb={3}>
          <Grid item xs={12} sm={3} md={2.5}>
            <TextField
              label="Start Date"
              type="date"
              variant="outlined"
              fullWidth
              size="small"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3} md={2.5}>
            <TextField
              label="End Date"
              type="date"
              variant="outlined"
              fullWidth
              size="small"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel id="restaurant-select-label" shrink>
                Restaurant
              </InputLabel>
              <Select
                labelId="restaurant-select-label"
                value={filterRestaurant}
                label="Restaurant"
                displayEmpty
                renderValue={(selected) =>
                  selected
                    ? restaurants.find(r => r.id === selected)?.name
                    : "All Restaurants"
                }
                onChange={(e) => setFilterRestaurant(e.target.value)}
                inputProps={{ 'aria-label': 'Restaurant' }}
              >
                <MenuItem value="">
                  <em>All Restaurants</em>
                </MenuItem>
                {restaurants.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} md={2.5}>
            <Autocomplete
              options={itemsList}
              value={filterItem}
              onChange={(_e, v) => setFilterItem(v)}
              renderInput={(params) => (
                <TextField {...params} label="Item (Search)" variant="outlined" size="small" />
              )}
              clearOnEscape
              isOptionEqualToValue={(option, value) => option === value}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={"auto"} md={"auto"} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={emailSending ? <CircularProgress size={16} color="inherit" /> : <EmailIcon fontSize="small" />}
              disabled={emailSending}
              onClick={async () => {
                try {
                  setEmailSending(true);

                  // Use the pre-rendered hidden report element
                  const reportEl = document.getElementById('waste-report-pdf-template');
                  if (!reportEl) throw new Error("Report template not found");

                  // Show temporarily to ensure layout is computed correctly
                  reportEl.style.display = 'block';

                  const dateRangeStr = `${filterStartDate} to ${filterEndDate}`;
                  const opt = {
                    margin: [0.5, 0.3, 0.5, 0.3], // top, left, bottom, right in inches
                    filename: `Waste_Report_${dateRangeStr.replace(/\s/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                      scale: 2,
                      useCORS: true,
                      logging: false,
                      windowWidth: 900
                    },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                  };

                  const pdfBlob = await html2pdf().from(reportEl).set(opt).outputPdf('blob');

                  // Hide again
                  reportEl.style.display = 'none';

                  const reader = new FileReader();
                  const base64 = await new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(pdfBlob);
                  });

                  const functions = getFunctions();
                  const sendWasteReport = httpsCallable(functions, 'sendWasteReportEmail');
                  await sendWasteReport({
                    pdfBase64: base64,
                    startDate: filterStartDate,
                    endDate: filterEndDate,
                  });
                  setSnackbar({ open: true, message: 'Waste report email sent successfully!', severity: 'success' });
                } catch (err) {
                  console.error('Error sending waste report email:', err);
                  setSnackbar({ open: true, message: 'Failed to send: ' + err.message, severity: 'error' });
                } finally {
                  setEmailSending(false);
                }
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 2,
                py: '7px',
                fontSize: '0.8125rem',
                whiteSpace: 'nowrap',
                background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
                },
              }}
            >
              Email to Kitchen
            </Button>
          </Grid>
        </Grid>

        {/* Loading */}
        {loading ? (
          <Box textAlign="center" mt={10}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* KPIs */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
                <Card sx={{ bgcolor: '#e3f2fd', borderRadius: 3, minHeight: 160, width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Total Waste Quantity
                    </Typography>
                    {normalizedWasteByUnit.length > 0 ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <MuiIconButton
                          size="small"
                          disabled={normalizedWasteByUnit.length <= 1}
                          onClick={() => setCarouselIndex((prev) => (prev - 1 + normalizedWasteByUnit.length) % normalizedWasteByUnit.length)}
                          sx={{ bgcolor: 'rgba(0,0,0,0.04)', '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' } }}
                        >
                          <ArrowBackIosNewIcon fontSize="small" />
                        </MuiIconButton>
                        <Box
                          sx={{
                            flex: 1,
                            textAlign: 'center',
                            bgcolor: CHIP_COLORS[carouselIndex % CHIP_COLORS.length].bg,
                            color: CHIP_COLORS[carouselIndex % CHIP_COLORS.length].text,
                            borderRadius: 2,
                            py: 1.5,
                            px: 2,
                            border: `1px solid ${CHIP_COLORS[carouselIndex % CHIP_COLORS.length].text}22`,
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {normalizedWasteByUnit[carouselIndex % normalizedWasteByUnit.length].qty.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, opacity: 0.75, mt: 0.25 }}>
                            {normalizedWasteByUnit[carouselIndex % normalizedWasteByUnit.length].unit}
                          </Typography>
                        </Box>
                        <MuiIconButton
                          size="small"
                          disabled={normalizedWasteByUnit.length <= 1}
                          onClick={() => setCarouselIndex((prev) => (prev + 1) % normalizedWasteByUnit.length)}
                          sx={{ bgcolor: 'rgba(0,0,0,0.04)', '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' } }}
                        >
                          <ArrowForwardIosIcon fontSize="small" />
                        </MuiIconButton>
                      </Box>
                    ) : (
                      <Typography variant="h4" color="text.secondary" sx={{ mt: 1 }}>0</Typography>
                    )}
                    {normalizedWasteByUnit.length > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 1 }}>
                        {normalizedWasteByUnit.map((_, idx) => (
                          <Box
                            key={idx}
                            onClick={() => setCarouselIndex(idx)}
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: idx === carouselIndex % normalizedWasteByUnit.length ? '#1565c0' : '#b0bec5',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
                <Card sx={{ bgcolor: '#ffebee', borderRadius: 3, minHeight: 160, width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Total Waste Value (£)
                    </Typography>
                    <Typography variant="h4">{totalWasteValue.toFixed(2)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
                <Card sx={{ bgcolor: '#e8f5e9', borderRadius: 3, minHeight: 160, width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Waste Events
                    </Typography>
                    <Typography variant="h4">{totalWasteEvents}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={4} mb={6}>
              <Grid item xs={12} md={6} lg={6}>
                <Typography variant="h6" mb={2}>
                  Waste Over Time (Quantity and Value)
                </Typography>
                <LineChart width={600} height={300} data={wasteByDate}>
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <ReTooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="wastedQuantity" name="Quantity (sum)" stroke="#8884d8" />
                  <Line yAxisId="right" type="monotone" dataKey="estimatedValue" name="Value (£)" stroke="#82ca9d" />
                </LineChart>
              </Grid>

              <Grid item xs={12} md={6} lg={6}>
                <Typography variant="h6" mb={2}>
                  Waste by Reason
                </Typography>
                {wasteByReason.length ? (
                  <PieChart width={400} height={300}>
                    <Pie
                      data={wasteByReason}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {wasteByReason.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                ) : (
                  <Typography>No data</Typography>
                )}
              </Grid>

              <Grid item xs={12} md={6} lg={6}>
                <Typography variant="h6" mb={2}>
                  Waste by Restaurant (Quantity)
                </Typography>
                {wasteByRestaurant.length ? (
                  <BarChart width={600} height={300} data={wasteByRestaurant}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ReTooltip />
                    <Bar dataKey="quantity" fill="#82ca9d" />
                  </BarChart>
                ) : (
                  <Typography>No data</Typography>
                )}
              </Grid>

              <Grid item xs={12} md={6} lg={6}>
                <Typography variant="h6" mb={2}>
                  Top 10 Waste Items (Quantity)
                </Typography>
                {wasteByItem.length ? (
                  <BarChart width={600} height={300} data={wasteByItem}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ReTooltip />
                    <Bar dataKey="quantity" fill="#8884d8" />
                  </BarChart>
                ) : (
                  <Typography>No data</Typography>
                )}
              </Grid>
            </Grid>

            {/* Waste Items Table */}
            <Typography variant="h6" mb={2}>
              Waste Events Detail
            </Typography>
            <Box ref={wasteGridRef} sx={{ height: 550, backgroundColor: 'white' }}>
              <DataGrid
                rows={filteredWasteItems}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                disableSelectionOnClick
                getRowId={(row) => row.id}
              />
            </Box>
          </>
        )}
      </Box>

      {/* Snackbar for email feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Hidden PDF Template for Emailing */}
      <div style={{ display: 'none' }}>
        <div id="waste-report-pdf-template" style={{ padding: '30px', backgroundColor: '#fff', width: '900px', boxSizing: 'border-box', fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' }}>
          <div style={{ borderBottom: '4px solid #1a237e', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, color: '#1a237e', fontSize: '32px' }}>Waste Management Report</h1>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '16px' }}>Arya Bhavan - Central Kitchen</p>
            </div>
            <img src={LOGO} alt="Logo" style={{ height: '70px' }} />
          </div>

          <div style={{ background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '30px', fontSize: '14px', fontFamily: 'sans-serif' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '15px' }}><strong>Date Range:</strong> {filterStartDate} to {filterEndDate}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}><strong>Restaurant:</strong> {getRestaurantName(filterRestaurant)}</td>
                  <td style={{ padding: '15px', textAlign: 'right', whiteSpace: 'nowrap' }}><strong>Generated:</strong> {new Date().toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <div style={{ flex: 1, background: '#ffebee', padding: '15px', borderRadius: '10px', borderLeft: '6px solid #d32f2f' }}>
              <div style={{ color: '#d32f2f', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Total Waste Value</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold' }}>£{totalWasteValue.toFixed(2)}</div>
            </div>
            <div style={{ flex: 1, background: '#e8f5e9', padding: '15px', borderRadius: '10px', borderLeft: '6px solid #2e7d32' }}>
              <div style={{ color: '#2e7d32', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Waste Events</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold' }}>{totalWasteEvents}</div>
            </div>
          </div>

          <h3 style={{ color: '#1a237e', marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Waste Events Detail</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Restaurant</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Item Name</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Unit</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Reason</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>Value (£)</th>
              </tr>
            </thead>
            <tbody>
              {filteredWasteItems.map(item => (
                <tr key={item.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.date}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{getRestaurantName(item.userId)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.itemName}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{parseFloat(item.wastedQuantity || 0).toFixed(2)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.unit || 'pcs'}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.reason || ''}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{parseFloat(item.estimatedValue || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '15px', textAlign: 'center', color: '#777', fontSize: '11px' }}>
            <p>Arya Bhavan Central Kitchen Management Suite - Professional Audit Report</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default WasteManagementTab;
