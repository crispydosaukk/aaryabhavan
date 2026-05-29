import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase-config";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  TextField,
  Stack,
  alpha,
  useMediaQuery,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid
} from "@mui/material";
import {
  Search,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { Person as PersonIcon, Event as EventIcon } from "@mui/icons-material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Header from "../components/header";
import appTheme from "../theme";
import moment from "moment";

const ConsolidatedReportsScreen = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [rawReports, setRawReports] = useState([]);
  const [groupedReports, setGroupedReports] = useState([]);
  const [periodFilter, setPeriodFilter] = useState("Weekly");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const fetchRestaurants = async () => {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRestaurants(data);
    };
    fetchRestaurants();
  }, []);

  const fetchReports = async (restaurant) => {
    const reportsRef = collection(db, "checklist_reports");
    const snapshot = await getDocs(reportsRef);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Filter for selected restaurant
    const filtered = data.filter(r => r.userId === restaurant.id || r.submittedByEmail === restaurant.email);
    setRawReports(filtered);
  };

  useEffect(() => {
    if (!selectedRestaurant) return;
    const grouped = groupReports(rawReports, periodFilter, customStartDate, customEndDate, filterCategory);
    setGroupedReports(grouped);
  }, [rawReports, periodFilter, customStartDate, customEndDate, selectedRestaurant, filterCategory]);

  const groupReports = (reports, filterType, customStart, customEnd, category) => {
    const grouped = {};

    reports.forEach((report) => {
      if (category !== "All") {
        const titleLower = (report.checklistTitle || '').toLowerCase();
        if (category === "Kitchen" && !titleLower.includes("kitchen")) return;
        if (category === "Restaurant" && !titleLower.includes("restaurant")) return;
      }

      const date = report.submittedAt?.toDate ? report.submittedAt.toDate() : new Date(report.submittedAt);
      if (!date || isNaN(date.getTime())) return;

      let key, label;

      if (filterType === "Today") {
        const today = new Date();
        today.setHours(0,0,0,0);
        const reportDay = new Date(date);
        reportDay.setHours(0,0,0,0);
        if (today.getTime() !== reportDay.getTime()) return;
        key = "today";
        label = "Today";
      } else if (filterType === "Yesterday") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0,0,0,0);
        const reportDay = new Date(date);
        reportDay.setHours(0,0,0,0);
        if (yesterday.getTime() !== reportDay.getTime()) return;
        key = "yesterday";
        label = "Yesterday";
      } else if (filterType === "Weekly") {
        const day = date.getDay();
        const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date);
        monday.setDate(diffToMonday);
        monday.setHours(0,0,0,0);
        key = `weekly-${monday.getTime()}`;
        label = `Week of ${moment(monday).format("MMM D, YYYY")}`;
      } else if (filterType === "Monthly") {
        const year = date.getFullYear();
        const month = date.getMonth();
        key = `monthly-${year}-${month}`;
        label = moment(date).format("MMMM YYYY");
      } else if (filterType === "Custom") {
        if (customStart && date < new Date(customStart)) return;
        if (customEnd) {
           const end = new Date(customEnd);
           end.setHours(23,59,59,999);
           if (date > end) return;
        }
        key = "custom";
        label = "Custom Range";
      }

      if (!grouped[key]) {
        grouped[key] = { label, reports: [] };
      }
      grouped[key].reports.push(report);
    });

    // Sort reports within each group by date descending
    Object.values(grouped).forEach(g => {
        g.reports.sort((a,b) => {
            const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
            const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(b.submittedAt);
            return dateB - dateA;
        });
    });

    return Object.values(grouped);
  };

  const handleRestaurantSelect = (restaurant) => {
    setSelectedRestaurant(restaurant);
    fetchReports(restaurant);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown Date";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return moment(date).format("MMM D, YYYY h:mm A");
  };

  const filteredRestaurants = restaurants.filter(r => r.restaurantName?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Box sx={{ backgroundColor: alpha(appTheme.colors.pastelCream, 0.3), minHeight: "100vh", pb: 3, pt: 2 }}>
      <Box maxWidth="xl" sx={{ mx: "auto", px: isMobile ? 1 : 3 }}>
        <Header title="Consolidated Reports" />
        
        <Paper elevation={2} sx={{ backgroundColor: "#fff", borderRadius: 2, p: 2, mb: 3 }}>
          {!selectedRestaurant ? (
            <>
              <TextField
                fullWidth
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment>,
                  sx: { mb: 2 }
                }}
              />
              <TableContainer sx={{ border: "1px solid #eee", borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: appTheme.colors.pastelGreen }}>
                      <TableCell sx={{ fontWeight: 600 }}>Restaurant</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRestaurants.map((restaurant) => (
                      <TableRow key={restaurant.id} hover>
                        <TableCell>{restaurant.restaurantName}</TableCell>
                        <TableCell>{restaurant.address}</TableCell>
                        <TableCell align="center">
                          <Button variant="outlined" size="small" onClick={() => handleRestaurantSelect(restaurant)}>View Reports</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Box>
                  <Button startIcon={<ArrowLeft />} onClick={() => setSelectedRestaurant(null)} sx={{ mr: 2 }}>Back</Button>
                  <Typography variant="h6" component="span" fontWeight={600}>{selectedRestaurant.restaurantName}</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Filter size={18} color={appTheme.colors.primary} />
                  {periodFilter === "Custom" && (
                    <>
                      <TextField type="date" size="small" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                      <TextField type="date" size="small" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </>
                  )}
                  <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} size="small" sx={{ minWidth: 120 }}>
                    <MenuItem value="All">All Categories</MenuItem>
                    <MenuItem value="Kitchen">Kitchen Checklists</MenuItem>
                    <MenuItem value="Restaurant">Restaurant Checklists</MenuItem>
                  </Select>
                  <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} size="small" sx={{ minWidth: 120 }}>
                    <MenuItem value="Today">Today</MenuItem>
                    <MenuItem value="Yesterday">Yesterday</MenuItem>
                    <MenuItem value="Weekly">Weekly</MenuItem>
                    <MenuItem value="Monthly">Monthly</MenuItem>
                    <MenuItem value="Custom">Custom</MenuItem>
                  </Select>
                </Stack>
              </Box>

              {groupedReports.length === 0 ? (
                <Typography align="center" color="textSecondary" sx={{ py: 5 }}>No reports found for this period.</Typography>
              ) : (
                groupedReports.map((group, gIndex) => (
                  <Box key={gIndex} sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ backgroundColor: appTheme.colors.pastelGreen, p: 1.5, borderRadius: 1, mb: 2, fontWeight: 'bold' }}>
                      {group.label} ({group.reports.length} forms submitted)
                    </Typography>
                    
                    {group.reports.map((report, idx) => (
                      <Accordion key={report.id} sx={{ mb: 1, border: "1px solid #eee", boxShadow: "none" }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: "#fafafa" }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={4}>
                              <Typography fontWeight={600} color={appTheme.colors.primary}>{report.checklistTitle || 'Unknown Form'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <PersonIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                <Typography variant="body2">{report.submittedByName || report.submittedByEmail || "Unknown User"}</Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <EventIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                <Typography variant="body2">{formatDate(report.submittedAt)}</Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: "#fff", p: 3 }}>
                          <Typography variant="subtitle2" fontWeight={600} mb={2} color="textSecondary">RESPONSES</Typography>
                          {report.answers && report.answers.length > 0 ? (
                            report.answers.map((ans, i) => (
                              <Box key={i} mb={2}>
                                <Typography variant="body2" fontWeight={600} mb={0.5} display="flex" alignItems="flex-start" gap={1}>
                                  <Chip label={`Q${i+1}`} size="small" sx={{ backgroundColor: appTheme.colors.pastelPeach, color: appTheme.colors.primary, fontWeight: "bold", height: 20, fontSize: "0.7rem", mt: 0.3 }} />
                                  {ans.question}
                                </Typography>
                                <Box sx={{ ml: 4, pl: 1.5, borderLeft: `2px solid ${appTheme.colors.pastelGreen}`, py: 0.5 }}>
                                  {ans.answer ? (
                                    ans.type === 'image' && String(ans.answer).startsWith('data:image') ? (
                                      <Box component="img" src={ans.answer} alt="Uploaded" sx={{ width: 100, height: 100, objectFit: "cover", borderRadius: 1 }} />
                                    ) : (
                                      <Typography variant="body2">{ans.answer}</Typography>
                                    )
                                  ) : (
                                    <Typography variant="body2" fontStyle="italic" color="text.disabled">No answer provided</Typography>
                                  )}
                                </Box>
                              </Box>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.disabled">No responses recorded.</Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                ))
              )}
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ConsolidatedReportsScreen;
