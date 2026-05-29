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
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from "@mui/material";
import {
  Search,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { Person as PersonIcon, Event as EventIcon, Visibility as VisibilityIcon, Close as CloseIcon } from "@mui/icons-material";
import Header from "../components/header";
import appTheme from "../theme";
import moment from "moment";

const ConsolidatedReportsScreen = () => {
  const [rawReports, setRawReports] = useState([]);
  const [groupedReports, setGroupedReports] = useState([]);
  const [periodFilter, setPeriodFilter] = useState("Today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [selectedReport, setSelectedReport] = useState(null);
  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const fetchReports = async () => {
      const reportsRef = collection(db, "checklist_reports");
      const snapshot = await getDocs(reportsRef);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawReports(data);
    };
    fetchReports();
  }, []);

  useEffect(() => {
    const grouped = groupReports(rawReports, periodFilter, customStartDate, customEndDate, filterCategory);
    setGroupedReports(grouped);
  }, [rawReports, periodFilter, customStartDate, customEndDate, filterCategory]);

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

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown Date";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return moment(date).format("MMM D, YYYY h:mm A");
  };

  return (
    <Box sx={{ backgroundColor: alpha(appTheme.colors.pastelCream, 0.3), minHeight: "100vh", pb: 3, pt: 2 }}>
      <Box maxWidth="xl" sx={{ mx: "auto", px: isMobile ? 1 : 3 }}>
        <Header title="Consolidated Reports" />
        
        <Paper elevation={2} sx={{ backgroundColor: "#fff", borderRadius: 2, p: 2, mb: 3 }}>
          <>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Typography variant="h6" component="span" fontWeight={600}>All Reports</Typography>
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

              {groupedReports.length === 0 || groupedReports.every(g => g.reports.length === 0) ? (
                <Typography align="center" color="textSecondary" sx={{ py: 5 }}>No reports found for this period.</Typography>
              ) : (
                <>
                  <Typography variant="h6" sx={{ mt: 2, mb: 2, color: appTheme.colors.dark }}>Submitted Reports Summary</Typography>
                  <TableContainer component={Paper} sx={{ mb: 4, borderRadius: 2, border: "1px solid #e0e0e0", boxShadow: "none" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "#2e7d32" }}>
                          <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Date</TableCell>
                          <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Checklist Title</TableCell>
                          <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Submitted By</TableCell>
                          <TableCell sx={{ color: "#fff", fontWeight: "bold", width: 60 }} align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupedReports.flatMap(g => g.reports).map((report, idx) => (
                          <TableRow key={report.id} sx={{ backgroundColor: idx % 2 === 0 ? "#f5f5f5" : "#ffffff" }}>
                            <TableCell>{formatDate(report.submittedAt)}</TableCell>
                            <TableCell>{report.checklistTitle || 'Unknown Form'}</TableCell>
                            <TableCell>{report.submittedByName || report.submittedByEmail || "Unknown User"}</TableCell>
                            <TableCell align="center">
                              <IconButton size="small" onClick={() => setSelectedReport(report)} sx={{ color: appTheme.colors.primary }}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Dialog open={!!selectedReport} onClose={() => setSelectedReport(null)} maxWidth="md" fullWidth>
                    {selectedReport && (
                      <>
                        <DialogTitle sx={{ backgroundColor: appTheme.colors.pastelCream, m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="h6" fontWeight="bold">
                            {selectedReport.checklistTitle || 'Unknown Form'}
                          </Typography>
                          <IconButton onClick={() => setSelectedReport(null)}>
                            <CloseIcon />
                          </IconButton>
                        </DialogTitle>
                        <DialogContent dividers sx={{ p: 3, backgroundColor: "#f9f9f9" }}>
                          <Box sx={{ mb: 3, pb: 2, borderBottom: "1px solid #e0e0e0" }}>
                            <Typography variant="subtitle2" color="textSecondary">
                              <strong>Date:</strong> {formatDate(selectedReport.submittedAt)}
                            </Typography>
                            <Typography variant="subtitle2" color="textSecondary">
                              <strong>Submitted By:</strong> {selectedReport.submittedByName || selectedReport.submittedByEmail || "Unknown User"}
                            </Typography>
                          </Box>
                          
                          {selectedReport.answers && selectedReport.answers.length > 0 ? (
                            selectedReport.answers.map((ans, i) => (
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
                        </DialogContent>
                      </>
                    )}
                  </Dialog>
                </>
              )}
            </>
        </Paper>
      </Box>
    </Box>
  );
};

export default ConsolidatedReportsScreen;
