import React from "react";
import { Box, Typography, Grid, Card, CardActionArea, Divider, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import KitchenIcon from "@mui/icons-material/Kitchen";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import GppGoodIcon from "@mui/icons-material/GppGood";
import appTheme from "../theme";

const Checklist = () => {
  const navigate = useNavigate();

  const kitchenChecklists = [
    { title: "Daily Kitchen Opening", path: "/kitchen-opening-checklist", icon: <WbSunnyIcon fontSize="large" color="primary" /> },
    { title: "Daily Kitchen Closing", path: "/kitchen-closing-checklist", icon: <NightsStayIcon fontSize="large" color="primary" /> },
    { title: "Daily Kitchen Cleaning", path: "/kitchen-cleaning-checklist", icon: <CleaningServicesIcon fontSize="large" color="primary" /> },
  ];

  const restaurantChecklists = [
    { title: "Daily Restaurant Opening", path: "/restaurant-opening-checklist", icon: <WbSunnyIcon fontSize="large" color="secondary" /> },
    { title: "Daily Restaurant Closing", path: "/restaurant-closing-checklist", icon: <NightsStayIcon fontSize="large" color="secondary" /> },
    { title: "Daily Kitchen EHO Compliance", path: "/eho-compliance-checklist", icon: <GppGoodIcon fontSize="large" color="secondary" /> },
  ];

  const renderChecklistCard = (item) => (
    <Grid item xs={12} sm={6} md={4} key={item.title}>
      <Card
        elevation={0}
        sx={{
          borderRadius: "16px",
          border: "1px solid #e0e0e0",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            borderColor: appTheme.colors.primary,
          },
        }}
      >
        <CardActionArea
          onClick={() => navigate(item.path)}
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 2,
          }}
        >
          {item.icon}
          <Typography variant="h6" fontWeight="bold" sx={{ color: "#333" }}>
            {item.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage questions for this checklist
          </Typography>
        </CardActionArea>
      </Card>
    </Grid>
  );

  return (
    <Box p={4} sx={{ maxWidth: 1200, mx: "auto" }}>
      <Box mb={4} display="flex" alignItems="center" gap={2}>
        <AssignmentTurnedInIcon sx={{ fontSize: 40, color: appTheme.colors.primary }} />
        <Box>
          <Typography variant="h4" color="primary" fontWeight="bold">
            Checklist Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select a checklist below to manage its questions.
          </Typography>
        </Box>
      </Box>

      {/* Kitchen Section */}
      <Paper elevation={0} sx={{ p: 4, mb: 4, borderRadius: "20px", background: "#f8f9fa" }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={3}>
          <KitchenIcon sx={{ color: appTheme.colors.primary, fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold" color="#2c3e50">
            Kitchen Checklists
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {kitchenChecklists.map(renderChecklistCard)}
        </Grid>
      </Paper>

      {/* Restaurant Section */}
      <Paper elevation={0} sx={{ p: 4, borderRadius: "20px", background: "#f8f9fa" }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={3}>
          <StorefrontIcon sx={{ color: appTheme.colors.secondary, fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold" color="#2c3e50">
            Restaurant Checklists
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {restaurantChecklists.map(renderChecklistCard)}
        </Grid>
      </Paper>
    </Box>
  );
};

export default Checklist;
