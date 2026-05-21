import React from "react";
import { Box, Typography, Grid, Card, CardActionArea } from "@mui/material";
import { useNavigate } from "react-router-dom";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import appTheme from "../theme";

const KitchenChecklist = () => {
  const navigate = useNavigate();

  return (
    <Box p={3}>
      <Typography variant="h4" color="primary" gutterBottom fontWeight="bold">
        Kitchen Checklists
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Select a specific kitchen checklist to proceed.
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: appTheme.borderRadius.lg, border: `1px solid ${appTheme.colors.pastelGreen}` }}>
            <CardActionArea onClick={() => navigate("/kitchen-opening-checklist")} sx={{ p: 4, textAlign: "center" }}>
              <WbSunnyIcon sx={{ fontSize: 60, color: appTheme.colors.primary, mb: 2 }} />
              <Typography variant="h6" fontWeight="bold">Daily Kitchen Opening Checklist</Typography>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: appTheme.borderRadius.lg, border: `1px solid ${appTheme.colors.pastelGreen}` }}>
            <CardActionArea onClick={() => navigate("/kitchen-closing-checklist")} sx={{ p: 4, textAlign: "center" }}>
              <NightsStayIcon sx={{ fontSize: 60, color: appTheme.colors.secondary, mb: 2 }} />
              <Typography variant="h6" fontWeight="bold">Daily Kitchen Closing Checklist</Typography>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: appTheme.borderRadius.lg, border: `1px solid ${appTheme.colors.pastelGreen}` }}>
            <CardActionArea onClick={() => navigate("/kitchen-cleaning-checklist")} sx={{ p: 4, textAlign: "center" }}>
              <CleaningServicesIcon sx={{ fontSize: 60, color: appTheme.colors.accent || "#00bfa5", mb: 2 }} />
              <Typography variant="h6" fontWeight="bold">Daily Kitchen Cleaning Checklist</Typography>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default KitchenChecklist;
