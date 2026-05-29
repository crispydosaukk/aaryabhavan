import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  useMediaQuery,
  Tooltip,
  Collapse,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import InventoryIcon from "@mui/icons-material/Inventory";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import DescriptionIcon from "@mui/icons-material/Description";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";
import CloseIcon from "@mui/icons-material/Close";
import KitchenIcon from "@mui/icons-material/Kitchen";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import AssignmentIcon from "@mui/icons-material/Assignment";
import LOGO from "../assets/abLogo.png";
import { useAuth } from "../auth-context";
import appTheme from "../theme";
import { TrashIcon } from "lucide-react";

const Sidebar = ({ onCollapse }) => {
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width:768px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false); // Controls expanded/collapsed state
  const [openSubmenu, setOpenSubmenu] = useState(""); // Track open submenu
  const { colors } = appTheme;
  const { userRole, logout } = useAuth();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSubmenuToggle = (text) => {
    if (collapsed) {
      setCollapsed(false);
      onCollapse(false);
    }
    setOpenSubmenu(openSubmenu === text ? "" : text);
  };

  const toggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapse(newCollapsed); // Notify parent about collapse state change
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Drawer width logic
  const drawerWidth = () => {
    if (isMobile) return "70%";
    return collapsed ? "80px" : "240px";
  };

  const menuItems = [
    { path: "/dashboard", icon: DashboardIcon, text: "Dashboard" },

    { path: "/inventory", icon: InventoryIcon, text: "Inventory" },

    { path: "/invoices", icon: ShoppingCartIcon, text: "Orders" },
    {
      path: "/ConsolidatedInvoiceScreen",
      icon: DescriptionIcon,
      text: "Invoices",
    },
    {
      path: "/purchaseInventory",
      icon: KitchenIcon,
      text: "Purchase Inventory",
    },
    { path: "/purchaseOrder", icon: KitchenIcon, text: "Purchase Order" },
    { path: "/ingredients", icon: KitchenIcon, text: "Ingredients" },
    { path: "/waste-management", icon: TrashIcon, text: "Waste Management" },
    {
      text: "Tasks & Reports",
      icon: AssignmentIcon,
      subItems: [
        { path: "/checklist", text: "Checklist" },
        { path: "/reports", text: "Report" },
        { path: "/consolidated-reports", text: "Consolidated Reports" },
      ],
    },
    ...(userRole === "superadmin"
      ? [
        { path: "/add-users", icon: PersonAddIcon, text: "Add Users" },
        { path: "/manage-users", icon: GroupIcon, text: "Manage Users" },
        ]
      : []),
  ];

  const sidebarStyles = {
    drawer: {
      width: drawerWidth(),
      flexShrink: 0,
      whiteSpace: "nowrap",
      transition: (theme) =>
        theme.transitions.create("width", {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      overflowX: "hidden",
      "& .MuiDrawer-paper": {
        width: drawerWidth(),
        boxSizing: "border-box",
        backgroundColor: colors.white,
        borderRight: "none",
        transition: (theme) =>
          theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      },
    },
    logoContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px",
      backgroundColor: colors.pastelGreen,
      minHeight: "60px",
    },
    logo: {
      height: "27px",
      transition: "opacity 0.3s ease",
      opacity: collapsed ? 0 : 1,
      width: collapsed ? 0 : "auto",
    },
    menuItem: (isItemActive) => ({
      margin: "4px 8px",
      borderRadius: "4px",
      backgroundColor: isItemActive ? colors.secondary : "transparent",
      "&:hover": {
        backgroundColor: isItemActive ? colors.secondary : colors.pastelPeach,
      },
      transition: "all 0.2s ease-in-out",
      justifyContent: collapsed ? "center" : "flex-start",
      minHeight: "48px",
    }),
    icon: (isItemActive) => ({
      color: isItemActive ? colors.white : colors.primary,
      minWidth: 0,
      marginRight: collapsed ? 0 : "16px",
      justifyContent: "center",
    }),
    text: (isItemActive) => ({
      color: isItemActive ? colors.white : colors.dark,
      fontWeight: isItemActive ? 600 : 400,
      opacity: collapsed ? 0 : 1,
      transition: "opacity 0.1s ease",
    }),
    toolbar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      padding: "0 8px",
      minHeight: "64px",
    },
    collapseButton: {
      margin: "8px auto",
      display: "flex",
      justifyContent: "center",
      "&:hover": {
        backgroundColor: "transparent",
      },
    },
    logoutButton: {
      margin: "16px auto",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: collapsed ? "48px" : "calc(100% - 32px)",
      height: "48px",
      borderRadius: "4px",
      backgroundColor: colors.secondary,
      color: colors.white,
      border: "none",
      cursor: "pointer",
      transition: "all 0.3s ease",
      "&:hover": {
        backgroundColor: colors.accent,
      },
    },
    logoutText: {
      opacity: collapsed ? 0 : 1,
      transition: "opacity 0.1s ease",
      marginLeft: "8px",
    },
  };

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{
            position: "fixed",
            left: "10px",
            top: "25px",
            zIndex: 1200,
            backgroundColor: colors.secondary,
            color: colors.white,
            "&:hover": {
              backgroundColor: colors.accent,
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        sx={sidebarStyles.drawer}
      >
        {/* Logo and close button */}
        <div style={sidebarStyles.logoContainer}>
          <img src={LOGO} alt="Logo" style={sidebarStyles.logo} />
          {isMobile ? (
            <IconButton onClick={handleDrawerToggle}>
              <CloseIcon />
            </IconButton>
          ) : (
            <IconButton onClick={toggleCollapse} size="small">
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          )}
        </div>

        {/* Menu items */}
        <List>
          {menuItems.map((item) => {
            if (item.subItems) {
              const isSubOpen = openSubmenu === item.text;
              return (
                <React.Fragment key={item.text}>
                  <Tooltip title={collapsed ? item.text : ""} placement="right">
                    <ListItem
                      button
                      onClick={() => handleSubmenuToggle(item.text)}
                      sx={sidebarStyles.menuItem(false)}
                    >
                      <ListItemIcon sx={sidebarStyles.icon(false)}>
                        <item.icon />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        sx={sidebarStyles.text(false)}
                      />
                      {!collapsed && (
                        isSubOpen ? (
                          <ExpandLess sx={{ color: colors.primary }} />
                        ) : (
                          <ExpandMore sx={{ color: colors.primary }} />
                        )
                      )}
                    </ListItem>
                  </Tooltip>
                  <Collapse in={isSubOpen && !collapsed} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.subItems.map((subItem) => (
                        <ListItem
                          button
                          component={Link}
                          to={subItem.path}
                          key={subItem.path}
                          sx={{
                            ...sidebarStyles.menuItem(isActive(subItem.path)),
                            pl: collapsed ? "8px" : 4,
                          }}
                          onClick={isMobile ? handleDrawerToggle : undefined}
                        >
                          <ListItemText
                            primary={subItem.text}
                            sx={sidebarStyles.text(isActive(subItem.path))}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </React.Fragment>
              );
            }

            return (
              <Tooltip title={collapsed ? item.text : ""} placement="right" key={item.path}>
                <ListItem
                  button
                  component={Link}
                  to={item.path}
                  sx={sidebarStyles.menuItem(isActive(item.path))}
                  onClick={isMobile ? handleDrawerToggle : undefined}
                >
                  <ListItemIcon sx={sidebarStyles.icon(isActive(item.path))}>
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={sidebarStyles.text(isActive(item.path))}
                  />
                </ListItem>
              </Tooltip>
            );
          })}
        </List>

        {/* Collapse button (desktop only) */}
        {!isMobile && (
          <div style={{ marginTop: "auto" }}>
            <button onClick={handleLogout} style={sidebarStyles.logoutButton}>
              <CloseIcon />
              <span style={sidebarStyles.logoutText}>Logout</span>
            </button>

            <IconButton
              onClick={toggleCollapse}
              sx={sidebarStyles.collapseButton}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default Sidebar;
