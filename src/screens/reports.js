import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import appTheme from "../theme";

const Reports = () => {
  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: appTheme.borderRadius.lg }}>
        <Typography variant="h4" color="primary" gutterBottom fontWeight="bold">
          Reports
        </Typography>
        <Typography variant="body1">
          This is the Reports module where users will submit their data.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Reports;
