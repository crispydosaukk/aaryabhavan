import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./screens/sidebar";
import AddUsers from "./screens/add-users";
import Inventory from "./screens/inventory";
import Invoices from "./screens/invoices";
import LoginScreen from "./screens/login";
import { AuthProvider, useAuth } from "./auth-context"; // Make sure to import AuthProvider
import Dashboard from "./screens/dashboard";
import ManageUsers from "./screens/manage-users";
import ConsolidatedInvoiceScreen from "./screens/ConsolidatedInvoiceScreen";
import ConsolidatedReportsScreen from "./screens/ConsolidatedReportsScreen";
import { createTheme, ThemeProvider, useMediaQuery } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import IngredientsScreen from "./screens/ingredientScreen";
import PurchaseInventory from "./screens/purchaseInventory";
import PurchaseOrder from "./screens/purchaseOrder";
import WasteManagementTab from "./screens/WasteManagementTab";
import Checklist from "./screens/checklist";
import Reports from "./screens/reports";
import KitchenChecklist from "./screens/kitchen-checklist";
import RestaurantChecklist from "./screens/restaurant-checklist";
import KitchenOpeningChecklist from "./screens/kitchen-opening-checklist";
import KitchenClosingChecklist from "./screens/kitchen-closing-checklist";
import KitchenCleaningChecklist from "./screens/kitchen-cleaning-checklist";
import RestaurantOpeningChecklist from "./screens/restaurant-opening-checklist";
import RestaurantClosingChecklist from "./screens/restaurant-closing-checklist";
import EHOComplianceChecklist from "./screens/eho-compliance-checklist";

const theme = createTheme({
  typography: {
    fontFamily: "'Roboto', sans-serif",
  },
  palette: {
    primary: {
      main: "#F5B300",
    },
    secondary: {
      main: "#FF0000",
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
};

const AppRoutes = () => {
  const isMobile = useMediaQuery("(max-width:768px)");
  const { userRole } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar onCollapse={setSidebarCollapsed} />
      <main style={{ width: sidebarCollapsed ? "100%" : "86%" }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-users" element={<AddUsers />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/ingredients" element={<IngredientsScreen />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/ConsolidatedInvoiceScreen" element={<ConsolidatedInvoiceScreen />} />
          <Route path="/purchaseInventory" element={<PurchaseInventory />} />
          <Route path="/purchaseOrder" element={<PurchaseOrder />} />
          {userRole === "superadmin" && (
            <Route path="/manage-users" element={<ManageUsers />} />
          )}
          <Route path="/waste-management" element={<WasteManagementTab />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/kitchenchecklist" element={<KitchenChecklist />} />
          <Route path="/restaurantchecklist" element={<RestaurantChecklist />} />
          <Route path="/kitchen-opening-checklist" element={<KitchenOpeningChecklist />} />
          <Route path="/kitchen-closing-checklist" element={<KitchenClosingChecklist />} />
          <Route path="/kitchen-cleaning-checklist" element={<KitchenCleaningChecklist />} />
          <Route path="/restaurant-opening-checklist" element={<RestaurantOpeningChecklist />} />
          <Route path="/restaurant-closing-checklist" element={<RestaurantClosingChecklist />} />
          <Route path="/eho-compliance-checklist" element={<EHOComplianceChecklist />} />
          <Route path="/consolidated-reports" element={<ConsolidatedReportsScreen />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LoginScreen />} />
              <Route
                path="*"
                element={
                  <ProtectedRoute>
                    <AppRoutes />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;