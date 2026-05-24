import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip,
  Grid,
  Dialog,
  IconButton,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import appTheme from "../theme";
import { db } from "../firebase-config";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterUser, setFilterUser] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, "checklist_reports"), orderBy("submittedAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReports(data);
      } catch (error) {
        console.error("Failed to fetch reports", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const uniqueTitles = ["All", ...new Set(reports.map(r => r.checklistTitle).filter(Boolean))];
  const uniqueUsers = ["All", ...new Set(reports.map(r => r.submittedByName || r.submittedByEmail || "Unknown User").filter(Boolean))];

  const filteredReports = reports.filter(r => {
    // 1. Title match
    if (filterType !== "All" && r.checklistTitle !== filterType) return false;
    
    // 2. Category match
    if (filterCategory !== "All") {
      const titleLower = (r.checklistTitle || '').toLowerCase();
      const isKitchen = titleLower.includes('kitchen');
      const isRestaurant = titleLower.includes('restaurant');
      if (filterCategory === "Kitchen" && !isKitchen) return false;
      if (filterCategory === "Restaurant" && !isRestaurant) return false;
    }

    // 3. User match
    if (filterUser !== "All") {
      const userName = r.submittedByName || r.submittedByEmail || "Unknown User";
      if (userName !== filterUser) return false;
    }

    // 4. Date range match
    if (startDate || endDate) {
      const reportDate = r.submittedAt?.toDate ? r.submittedAt.toDate() : new Date(r.submittedAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (reportDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (reportDate > end) return false;
      }
    }

    return true;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown Date";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <Box p={3} sx={{ maxWidth: 1000, margin: "0 auto" }}>
      <Typography variant="h4" color="primary" gutterBottom fontWeight="bold" display="flex" alignItems="center" gap={1}>
        <AssignmentTurnedInIcon fontSize="large" />
        Submitted Checklist Reports
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: "text.secondary" }}>
        Review and track all checklists submitted by staff members from the mobile application.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: "16px", border: `1px solid ${appTheme.colors.pastelGreen}`, backgroundColor: "#fff" }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>Filter Reports</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select value={filterCategory} label="Category" onChange={e => setFilterCategory(e.target.value)}>
                <MenuItem value="All">All Categories</MenuItem>
                <MenuItem value="Kitchen">Kitchen Checklists</MenuItem>
                <MenuItem value="Restaurant">Restaurant Checklists</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Specific Form</InputLabel>
              <Select value={filterType} label="Specific Form" onChange={e => setFilterType(e.target.value)}>
                {uniqueTitles.map((title, i) => <MenuItem key={i} value={title}>{title}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Submitted By</InputLabel>
              <Select value={filterUser} label="Submitted By" onChange={e => setFilterUser(e.target.value)}>
                {uniqueUsers.map((user, i) => <MenuItem key={i} value={user}>{user}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.25}>
            <TextField 
              fullWidth size="small" type="date" label="Start Date" 
              InputLabelProps={{ shrink: true }} 
              value={startDate} onChange={e => setStartDate(e.target.value)} 
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.25}>
            <TextField 
              fullWidth size="small" type="date" label="End Date" 
              InputLabelProps={{ shrink: true }} 
              value={endDate} onChange={e => setEndDate(e.target.value)} 
            />
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="40vh">
          <CircularProgress sx={{ color: appTheme.colors.primary }} />
        </Box>
      ) : filteredReports.length === 0 ? (
        <Box textAlign="center" py={10} sx={{ backgroundColor: "#f9f9f9", borderRadius: "16px", border: "1px dashed #ccc" }}>
          <AssignmentTurnedInIcon sx={{ fontSize: 60, color: "#ccc", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No reports found.</Typography>
          <Typography variant="body2" color="text.disabled">Try changing your filter or wait for new submissions.</Typography>
        </Box>
      ) : (
        <Box>
          {filteredReports.map((report, index) => (
            <Accordion 
              key={report.id} 
              elevation={0}
              sx={{ 
                mb: 2, 
                borderRadius: "12px !important", 
                border: "1px solid #eee",
                "&:before": { display: "none" },
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: "#fafafa", px: 3, py: 1 }}>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item xs={12} sm={5}>
                    <Typography variant="subtitle1" fontWeight="bold" color={appTheme.colors.primary}>
                      {report.checklistTitle || 'Unknown Checklist'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                      <Typography variant="body2" color="text.secondary">
                        {report.submittedByName || report.submittedByEmail || "Unknown User"}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <EventIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(report.submittedAt)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 4, py: 3, backgroundColor: "#fff" }}>
                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" mb={2}>SUBMITTED ANSWERS</Typography>
                
                {report.answers && report.answers.length > 0 ? (
                  report.answers.map((ans, i) => (
                    <Box key={i} mb={2.5}>
                      <Typography variant="body1" fontWeight={600} mb={0.5} display="flex" alignItems="flex-start" gap={1}>
                        <Chip label={`Q${i+1}`} size="small" sx={{ backgroundColor: appTheme.colors.pastelPeach, color: appTheme.colors.primary, fontWeight: "bold", height: 20, fontSize: "0.7rem", mt: 0.3 }} />
                        {ans.question}
                      </Typography>
                      <Box sx={{ ml: 4.5, pl: 2, borderLeft: `2px solid ${appTheme.colors.pastelGreen}`, py: 0.5 }}>
                        {ans.answer ? (
                          ans.type === 'image' && String(ans.answer).startsWith('data:image') ? (
                            <Box 
                              component="img" 
                              src={ans.answer} 
                              alt="Uploaded" 
                              sx={{ 
                                width: 100, 
                                height: 100, 
                                objectFit: "cover", 
                                borderRadius: "8px", 
                                cursor: "pointer",
                                border: "1px solid #ddd"
                              }}
                              onClick={() => setPreviewImage(ans.answer)}
                            />
                          ) : ans.type === 'image' ? (
                            <Typography variant="body2" fontStyle="italic" color="text.secondary">
                              [Image marked as uploaded, but no valid data found]
                            </Typography>
                          ) : (
                            <Typography variant="body1" color="text.primary">
                              {ans.answer}
                            </Typography>
                          )
                        ) : (
                          <Typography variant="body2" fontStyle="italic" color="text.disabled">
                            No answer provided
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.disabled">No answers recorded for this submission.</Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Image Preview Dialog */}
      <Dialog 
        open={Boolean(previewImage)} 
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ position: "relative", backgroundColor: "#000", textAlign: "center", p: 2 }}>
          <IconButton 
            onClick={() => setPreviewImage(null)} 
            sx={{ position: "absolute", top: 8, right: 8, color: "#fff", backgroundColor: "rgba(0,0,0,0.5)", "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" } }}
          >
            <CloseIcon />
          </IconButton>
          <img 
            src={previewImage} 
            alt="Preview" 
            style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} 
          />
        </Box>
      </Dialog>
    </Box>
  );
};

export default Reports;
