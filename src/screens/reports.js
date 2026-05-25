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
  Chip,
  Grid,
  Dialog,
  IconButton,
  TextField,
  Pagination,
  Button,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import DeleteIcon from "@mui/icons-material/Delete";
import EmailIcon from "@mui/icons-material/Email";
import appTheme from "../theme";
import { db } from "../firebase-config";
import { collection, query, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import html2pdf from "html2pdf.js";
import LOGO from "../assets/abLogo.png";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterUser, setFilterUser] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const reportsPerPage = 10;

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  
  const [previewImage, setPreviewImage] = useState(null);
  
  // Email
  const [emailSending, setEmailSending] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    setPage(1);
  }, [filterType, filterCategory, filterUser, startDate, endDate]);

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

  const availableTitlesForCategory = reports
    .map(r => r.checklistTitle)
    .filter(Boolean)
    .filter(title => {
      if (filterCategory === "All") return true;
      const titleLower = title.toLowerCase();
      if (filterCategory === "Kitchen" && titleLower.includes("kitchen")) return true;
      if (filterCategory === "Restaurant" && titleLower.includes("restaurant")) return true;
      return false;
    });

  const uniqueTitles = ["All", ...new Set(availableTitlesForCategory)];
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

  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  const paginatedReports = filteredReports.slice((page - 1) * reportsPerPage, page * reportsPerPage);

  const handleDeleteClick = (e, report) => {
    e.stopPropagation();
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (reportToDelete) {
      try {
        await deleteDoc(doc(db, "checklist_reports", reportToDelete.id));
        setReports(reports.filter(r => r.id !== reportToDelete.id));
      } catch (error) {
        console.error("Error deleting report: ", error);
      }
    }
    setDeleteDialogOpen(false);
    setReportToDelete(null);
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">Filter Reports</Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={emailSending ? <CircularProgress size={16} color="inherit" /> : <EmailIcon fontSize="small" />}
            disabled={emailSending}
            onClick={async () => {
              try {
                setEmailSending(true);

                const reportEl = document.getElementById('checklist-report-pdf-template');
                if (!reportEl) throw new Error("Report template not found");

                reportEl.style.display = 'block';

                const opt = {
                  margin: [0.4, 0.4, 0.4, 0.4],
                  filename: `Checklist_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 720 },
                  jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
                  pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                };

                const pdfBlob = await html2pdf().from(reportEl).set(opt).outputPdf('blob');
                reportEl.style.display = 'none';

                const reader = new FileReader();
                const base64 = await new Promise((resolve, reject) => {
                  reader.onloadend = () => resolve(reader.result.split(',')[1]);
                  reader.onerror = reject;
                  reader.readAsDataURL(pdfBlob);
                });

                const functions = getFunctions();
                const sendChecklistReport = httpsCallable(functions, 'sendChecklistReportEmail');
                await sendChecklistReport({
                  pdfBase64: base64,
                  startDate,
                  endDate,
                  category: filterCategory,
                  formType: filterType
                });
                
                setSnackbar({ open: true, message: 'Checklist report email sent successfully!', severity: 'success' });
              } catch (err) {
                console.error('Error sending checklist report email:', err);
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
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select 
                value={filterCategory} 
                label="Category" 
                onChange={e => {
                  setFilterCategory(e.target.value);
                  setFilterType("All");
                }}
              >
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
          {paginatedReports.map((report, index) => (
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
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle1" fontWeight="bold" color={appTheme.colors.primary}>
                      {report.checklistTitle || 'Unknown Checklist'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
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
                  <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton 
                      onClick={(e) => handleDeleteClick(e, report)} 
                      color="error" 
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
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
          
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4} mb={2}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(e, value) => setPage(value)} 
                color="primary" 
              />
            </Box>
          )}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this report? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
        <div id="checklist-report-pdf-template" style={{ padding: '40px', backgroundColor: '#fff', width: '720px', boxSizing: 'border-box', fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' }}>
          <div style={{ borderBottom: `3px solid ${appTheme.colors.primary}`, paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, color: appTheme.colors.primary, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Checklist Reports</h1>
              <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>Arya Bhavan - Central Kitchen</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <img src={LOGO} alt="Logo" style={{ height: '55px', objectFit: 'contain', marginBottom: '8px' }} />
              <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.5' }}>
                <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
                <div><strong>Submitted By:</strong> {filterUser === "All" ? "All Users" : filterUser}</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '30px', fontSize: '14px', fontFamily: 'sans-serif' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '15px', width: '50%' }}><strong>Category:</strong> {filterCategory}</td>
                  <td style={{ padding: '15px', width: '50%' }}><strong>Form:</strong> {filterType}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 style={{ color: appTheme.colors.primary, marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Submitted Reports Summary</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '30px' }}>
            <thead>
              <tr style={{ backgroundColor: appTheme.colors.primary, color: 'white' }}>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Checklist Title</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Submitted By</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => (
                <tr key={report.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatDate(report.submittedAt)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{report.checklistTitle || 'Unknown Checklist'}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{report.submittedByName || report.submittedByEmail || 'Unknown User'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ color: appTheme.colors.primary, marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Detailed Answers</h3>
          {filteredReports.map((report, idx) => (
            <div key={idx} style={{ marginBottom: '20px', padding: '15px', background: '#fafafa', border: '1px solid #eee', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>
                {report.checklistTitle || 'Unknown Checklist'} - {formatDate(report.submittedAt)} 
                <span style={{ fontWeight: 'normal', color: '#666', fontSize: '13px' }}> (By: {report.submittedByName || report.submittedByEmail || 'Unknown User'})</span>
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  {report.answers && report.answers.map((ans, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', width: '40%', verticalAlign: 'top', fontWeight: 'bold', color: '#555' }}>
                        {ans.question}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', width: '60%', verticalAlign: 'top' }}>
                        {ans.type === 'image' && String(ans.answer).startsWith('data:image') 
                          ? '[Image Uploaded]' 
                          : (ans.answer || 'No answer')}
                      </td>
                    </tr>
                  ))}
                  {(!report.answers || report.answers.length === 0) && (
                    <tr><td colSpan="2" style={{ padding: '8px', fontStyle: 'italic', color: '#999' }}>No answers provided.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '15px', textAlign: 'center', color: '#777', fontSize: '11px' }}>
            <p>Arya Bhavan Central Kitchen Management Suite - Automated Report</p>
          </div>
        </div>
      </div>
    </Box>
  );
};

export default Reports;
