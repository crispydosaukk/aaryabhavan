import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import ImageIcon from "@mui/icons-material/Image";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import appTheme from "../theme";
import { db } from "../firebase-config";
import { doc, setDoc, getDoc } from "firebase/firestore";

const ANSWER_TYPES = [
  { value: "multiple", label: "Multiple Options", icon: <CheckBoxIcon fontSize="small" /> },
  { value: "text", label: "Text Input", icon: <TextFieldsIcon fontSize="small" /> },
  { value: "image", label: "Image Upload", icon: <ImageIcon fontSize="small" /> },
  { value: "date", label: "Date Selection", icon: <CalendarTodayIcon fontSize="small" /> },
];

const defaultQuestion = () => ({
  id: Date.now(),
  question: "",
  type: "multiple",
  options: ["Yes", "No"],
  allowOther: false,
  required: true,
});

const KitchenClosingChecklist = () => {
  const [questions, setQuestions] = useState([defaultQuestion()]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const docRef = doc(db, "checklists", "kitchen-closing");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().questions?.length > 0) {
          setQuestions(docSnap.data().questions);
        }
      } catch (err) {
        console.error("Failed to load checklist:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchChecklist();
  }, []);

  const addQuestion = () => setQuestions([...questions, defaultQuestion()]);
  const removeQuestion = (id) => setQuestions(questions.filter((q) => q.id !== id));
  const updateQuestion = (id, field, value) => setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  const addOption = (id) => setQuestions(questions.map((q) => q.id === id ? { ...q, options: [...(q.options || []), ""] } : q));
  const updateOption = (questionId, optionIndex, value) => setQuestions(questions.map((q) => q.id === questionId ? { ...q, options: q.options.map((opt, i) => (i === optionIndex ? value : opt)) } : q));
  const removeOption = (questionId, optionIndex) => setQuestions(questions.map((q) => q.id === questionId ? { ...q, options: q.options.filter((_, i) => i !== optionIndex) } : q));

  const handleSave = async () => {
    const invalid = questions.some((q) => !q.question.trim());
    if (invalid) {
      setToast({ open: true, message: "Please fill in all question titles.", severity: "error" });
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, "checklists", "kitchen-closing"), {
        title: "Daily Kitchen Closing Checklist",
        questions,
        updatedAt: new Date().toISOString(),
      });
      setToast({ open: true, message: "Checklist saved successfully!", severity: "success" });
    } catch (err) {
      setToast({ open: true, message: "Failed to save. Please try again.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress sx={{ color: appTheme.colors.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 820, mx: "auto", py: 4, px: { xs: 2, md: 3 } }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: "16px", borderTop: `6px solid ${appTheme.colors.primary}`, background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
        <Typography variant="h5" fontWeight="bold" color={appTheme.colors.primary}>Daily Kitchen Closing Checklist</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Add questions and choose the answer type for each. Users will fill this in the mobile app.</Typography>
      </Paper>
      {questions.map((q, index) => (
        <Card key={q.id} elevation={0} sx={{ mb: 2.5, borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", border: "1px solid #f0f0f0", transition: "box-shadow 0.2s", "&:hover": { boxShadow: "0 4px 18px rgba(0,0,0,0.12)" } }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <DragIndicatorIcon sx={{ color: "#ccc", cursor: "grab" }} />
              <Chip label={`Q${index + 1}`} size="small" sx={{ backgroundColor: appTheme.colors.primary, color: "#fff", fontWeight: "bold", fontSize: "0.7rem" }} />
              <Box flex={1} />
              <Tooltip title="Remove question">
                <IconButton size="small" onClick={() => removeQuestion(q.id)} disabled={questions.length === 1} sx={{ color: "#e53935" }}><DeleteOutlineIcon /></IconButton>
              </Tooltip>
            </Box>
            <TextField fullWidth placeholder="Enter your question here..." value={q.question} onChange={(e) => updateQuestion(q.id, "question", e.target.value)} variant="standard" multiline InputProps={{ disableUnderline: false, style: { fontSize: "1rem", fontWeight: 500 } }} sx={{ mb: 2.5 }} />
            <FormControl size="small" sx={{ minWidth: 200, mb: 2.5 }}>
              <InputLabel>Answer Type</InputLabel>
              <Select value={q.type} label="Answer Type" onChange={(e) => updateQuestion(q.id, "type", e.target.value)} sx={{ borderRadius: "8px" }}>
                {ANSWER_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}><Box display="flex" alignItems="center" gap={1}>{t.icon}{t.label}</Box></MenuItem>
                ))}
              </Select>
            </FormControl>
            <Divider sx={{ mb: 2 }} />
            {q.type === "multiple" && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1} display="block">OPTIONS</Typography>
                {(q.options || []).map((opt, i) => (
                  <Box key={i} display="flex" alignItems="center" gap={1} mb={1}>
                    <Box sx={{ width: 18, height: 18, border: "2px solid #ccc", borderRadius: "3px", flexShrink: 0 }} />
                    <TextField size="small" value={opt} onChange={(e) => updateOption(q.id, i, e.target.value)} placeholder={`Option ${i + 1}`} variant="standard" fullWidth sx={{ "& input": { fontSize: "0.9rem" } }} />
                    <Tooltip title="Remove option"><IconButton size="small" onClick={() => removeOption(q.id, i)} disabled={(q.options || []).length <= 1 && !q.allowOther} sx={{ color: "#bbb" }}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                  </Box>
                ))}
                
                {q.allowOther && (
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Box sx={{ width: 18, height: 18, border: "2px solid #ccc", borderRadius: "3px", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ mr: 1, ml: 1 }}>Other:</Typography>
                    <TextField size="small" placeholder="User will type here" variant="standard" disabled fullWidth sx={{ "& input": { fontSize: "0.9rem" } }} />
                    <Tooltip title="Remove 'Other' option">
                      <IconButton size="small" onClick={() => updateQuestion(q.id, "allowOther", false)} sx={{ color: "#bbb" }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                <Box display="flex" gap={1} mt={0.5}>
                  <Button startIcon={<AddIcon />} size="small" onClick={() => addOption(q.id)} sx={{ color: appTheme.colors.primary, textTransform: "none" }}>Add Option</Button>
                  {!q.allowOther && (
                    <Button size="small" onClick={() => updateQuestion(q.id, "allowOther", true)} sx={{ color: appTheme.colors.secondary, textTransform: "none" }}>Add "Other"</Button>
                  )}
                </Box>
              </Box>
            )}
            {q.type === "text" && (
              <Box sx={{ p: 1.5, borderRadius: "8px", backgroundColor: "#f9f9f9", border: "1px dashed #ddd" }}><Typography variant="body2" color="text.disabled" fontStyle="italic">User will type their answer here...</Typography></Box>
            )}
            {q.type === "image" && (
              <Box sx={{ p: 2, borderRadius: "8px", backgroundColor: "#f9f9f9", border: "1px dashed #ddd", display: "flex", alignItems: "center", gap: 1.5 }}><ImageIcon sx={{ color: "#aaa", fontSize: 32 }} /><Typography variant="body2" color="text.disabled" fontStyle="italic">User will upload an image here...</Typography></Box>
            )}
            {q.type === "date" && (
              <Box sx={{ p: 1.5, borderRadius: "8px", backgroundColor: "#f9f9f9", border: "1px dashed #ddd", display: "inline-flex", alignItems: "center", gap: 1.5, minWidth: 200 }}>
                <Typography variant="body1" color="text.secondary">mm/dd/yyyy</Typography>
                <Box flex={1} />
                <CalendarTodayIcon sx={{ color: "#555", fontSize: 20 }} />
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
      <Paper elevation={0} onClick={addQuestion} sx={{ p: 2, mb: 3, borderRadius: "14px", border: `2px dashed ${appTheme.colors.primary}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 1, cursor: "pointer", backgroundColor: "#fffbf0", transition: "background 0.2s", "&:hover": { backgroundColor: "#fff3cd" } }}>
        <AddCircleOutlineIcon sx={{ color: appTheme.colors.primary }} />
        <Typography fontWeight={600} color={appTheme.colors.primary}>Add New Question</Typography>
      </Paper>
      <Box display="flex" justifyContent="flex-end">
        <Button variant="contained" size="large" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={loading} sx={{ backgroundColor: appTheme.colors.primary, borderRadius: "10px", px: 4, py: 1.2, fontWeight: "bold", textTransform: "none", fontSize: "1rem", "&:hover": { backgroundColor: appTheme.colors.secondary } }}>{loading ? "Saving..." : "Save Checklist"}</Button>
      </Box>
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}><Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ borderRadius: "10px" }}>{toast.message}</Alert></Snackbar>
    </Box>
  );
};

export default KitchenClosingChecklist;
