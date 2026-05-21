import React from "react";
import { Box, Typography, Grid, Card, CardActionArea } from "@mui/material";
import { useNavigate } from "react-router-dom";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import appTheme from "../theme";

const RestaurantChecklist = () => {
  const navigate = useNavigate();

  return (
    <Box p={3}>
      <Typography variant="h4" color="primary" gutterBottom fontWeight="bold">
        Restaurant Checklists
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Select a specific restaurant checklist to proceed.
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: appTheme.borderRadius.lg, border: `1px solid ${appTheme.colors.pastelGreen}` }}>
            <CardActionArea onClick={() => navigate("/restaurant-opening-checklist")} sx={{ p: 4, textAlign: "center" }}>
              <WbSunnyIcon sx={{ fontSize: 60, color: appTheme.colors.primary, mb: 2 }} />
              <Typography variant="h6" fontWeight="bold">Daily Restaurant Opening Checklist</Typography>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: appTheme.borderRadius.lg, border: `1px solid ${appTheme.colors.pastelGreen}` }}>
            <CardActionArea onClick={() => navigate("/restaurant-closing-checklist")} sx={{ p: 4, textAlign: "center" }}>
              <NightsStayIcon sx={{ fontSize: 60, color: appTheme.colors.secondary, mb: 2 }} />
              <Typography variant="h6" fontWeight="bold">Daily Restaurant Closing Checklist</Typography>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: appTheme.borderRadius.lg, border: `1px solid ${appTheme.colors.pastelGreen}` }}>
            <CardActionArea onClick={() => navigate("/eho-compliance-checklist")} sx={{ p: 4, textAlign: "center" }}>
              <AssignmentTurnedInIcon sx={{ fontSize: 60, color: appTheme.colors.accent || "#00bfa5", mb: 2 }} />
              <Typography variant="h6" fontWeight="bold">Daily Kitchen EHO Compliance Checklist</Typography>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RestaurantChecklist;
