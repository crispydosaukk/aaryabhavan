import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Paper,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  Chip,
  Stack,
} from "@mui/material";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import {
  AlertCircle,
  TrendingUp,
  Package,
  CircleDollarSign,
  ShoppingBag,
  ChevronDown,
  PoundSterling,
  ClipboardX,
} from "lucide-react";
import { collection, query, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase-config";
import fetchRestaurantPerformance from "./fetchRestaurantPerformance";
import TodayInvoicesGrid from "../components/TodayInvoicesGrid";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { DateTime } from "luxon";
import SalesCards from "../components/SalesCards";
import appTheme from "../theme";

const Dashboard = () => {
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [restaurantPerformance, setRestaurantPerformance] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [todayOrders, setTodayOrders] = useState({});
  const [totalAvailable, setTotalAvailable] = useState({});
  const [totalSold, setTotalSold] = useState({});
  const [totalCombined, setTotalCombined] = useState({});
  const [todayRestaurantOrders, setTodayRestaurantOrders] = useState([]);
  const [restaurantUnpaidRevenue, setRestaurantUnpaidRevenue] = useState([]);
  const [isCutoffEnabled, setIsCutoffEnabled] = useState(false);
  const [pendingPurchaseOrders, setPendingPurchaseOrders] = useState([]);
  const [inventoryStatus, setInventoryStatus] = useState({
    ingredients: 0,
    products: 0,
    derived: 0,
  });
  const [todayInvoices, setTodayInvoices] = useState([]);

  const getChartHeight = () => {
    return window.innerWidth <= 768 ? 200 : 300;
  };

  const checkAndUpdateCutoffStatus = async () => {
    try {
      const docRef = doc(db, "cutoffTime", "GCMLKWYcSCWKq0RvKrbB");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setIsCutoffEnabled(docSnap.data().isCutoffEnabled);
      }
    } catch (error) {
      console.error("Error fetching cutoff status:", error);
    }
  };

  useEffect(() => {
    checkAndUpdateCutoffStatus();
  }, []);

  const handleToggleChange = async () => {
    const newValue = !isCutoffEnabled;
    setIsCutoffEnabled(newValue);

    try {
      const docRef = doc(db, "cutoffTime", "GCMLKWYcSCWKq0RvKrbB");
      await updateDoc(docRef, { isCutoffEnabled: newValue });
    } catch (error) {
      console.error("Error updating cutoff status:", error);
    }
  };

  const [chartHeight, setChartHeight] = useState(getChartHeight());

  useEffect(() => {
    const handleResize = () => {
      setChartHeight(getChartHeight());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getResturantPerformanceData = async () => {
    const restaurantPerformanceData = await fetchRestaurantPerformance(db);
    setRestaurantPerformance(restaurantPerformanceData);
  };

  useEffect(() => {
    // Define todayStart as 11 AM UTC, and todayEnd as 11 AM next day UTC
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(11, 0, 0, 0);
  
    if (now.getUTCHours() < 11) {
      todayStart.setUTCDate(todayStart.getUTCDate() - 1);
    }
  
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  
    const invoicesRef = collection(db, "invoices");
    const purchaseOrdersRef = collection(db, "purchaseOrders");
    const ingredientsRef = collection(db, "ingredients");
  
    // Orders Listener
    const unsubscribeOrders = onSnapshot(invoicesRef, (snapshot) => {
      const ordersCount = {};
      const salesData = [];
      const statusCount = new Map();
      const restaurantOrders = new Map();
      const restaurantUnpaid = new Map();
      const todayInvoicesData = [];
  
      if (!snapshot.empty) {
        snapshot.forEach((doc) => {
          const invoice = { id: doc.id, ...doc.data() };
          const createdAt = invoice.createdAt;
          let invoiceDate;
  
          if (createdAt && createdAt.seconds) {
            invoiceDate = new Date(createdAt.seconds * 1000);
          } else if (typeof createdAt === "string") {
            invoiceDate = new Date(createdAt);
          }
  
          // Filter invoices from today 11 AM to next day 11 AM
          if (invoiceDate && invoiceDate >= todayStart && invoiceDate < todayEnd) {
            if (invoice.restaurantName) {
              restaurantOrders.set(
                invoice.restaurantName,
                (restaurantOrders.get(invoice.restaurantName) || 0) + 1
              );
              todayInvoicesData.push(invoice);
            }
  
            if (invoice.restaurantName) {
              ordersCount[invoice.restaurantName] =
                (ordersCount[invoice.restaurantName] || 0) + 1;
            }
          }
  
          // Restaurant Unpaid Revenue
          if (!invoice.isBillPaid && invoice.restaurantName) {
            const invoiceTotal = invoice.items.reduce(
              (sum, item) => sum + (item.price * item.quantity || 0),
              0
            );
            restaurantUnpaid.set(
              invoice.restaurantName,
              (restaurantUnpaid.get(invoice.restaurantName) || 0) + invoiceTotal
            );
          }
  
          // Order Status
          const status =
            (invoice.orderStatus || "Pending").charAt(0).toUpperCase() +
            (invoice.orderStatus || "Pending").slice(1);
          statusCount.set(status, (statusCount.get(status) || 0) + 1);
  
          // Sales Trend (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
          if (invoiceDate && invoiceDate >= sevenDaysAgo) {
            const formattedDate = invoiceDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            });
  
            const existingDay = salesData.find(
              (item) => item.date === formattedDate
            );
            const dailySales = invoice.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );
            if (existingDay) {
              existingDay.Sales += dailySales;
            } else {
              salesData.push({
                date: formattedDate,
                Sales: dailySales,
              });
            }
          }
        });
  
        // Sort sales data by date
        salesData.sort((a, b) => {
          const [dayA, monthA] = a.date.split(" ");
          const [dayB, monthB] = b.date.split(" ");
          const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
          ];
  
          const monthIndexA = months.indexOf(monthA);
          const monthIndexB = months.indexOf(monthB);
  
          return (
            monthIndexA * 31 + parseInt(dayA) -
            (monthIndexB * 31 + parseInt(dayB))
          );
        });
  
        setOrderStatusData(
          Array.from(statusCount, ([name, value]) => ({ name, value }))
        );
        setTodayOrders(ordersCount);
        setSalesTrend(salesData);
        setTodayRestaurantOrders(
          Array.from(restaurantOrders, ([name, orders]) => ({ name, orders }))
        );
        setTodayInvoices(todayInvoicesData);
        setRestaurantUnpaidRevenue(
          Array.from(restaurantUnpaid, ([name, unpaid]) => ({
            name,
            unpaid: parseFloat(unpaid.toFixed(2)),
          }))
        );
      }
    });
  
    // Purchase Orders Listener
    const unsubscribePurchaseOrders = onSnapshot(purchaseOrdersRef, async (snapshot) => {
      const pendingOrders = [];
      const ingredientsSnapshot = await getDocs(ingredientsRef);
      const ingredientsData = ingredientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      snapshot.forEach((doc) => {
        const order = doc.data();
        if (order.status === "pending") {
          const orderItemsWithDetails = order.orderItems.map(item => {
            const ingredient = ingredientsData.find(ing => ing.id === item.id);
            return {
              ...item,
              title: ingredient?.title || item.title,
              units: ingredient?.units || item.units
            };
          });
  
          pendingOrders.push({
            id: doc.id,
            date: order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A",
            items: orderItemsWithDetails
          });
        }
      });
  
      setPendingPurchaseOrders(pendingOrders);
    });
  
    // Total Available Metrics
    const inventoryRef = collection(db, "inventoryItems");
  
    const unsubscribeTotalAvailable = onSnapshot(inventoryRef, async (snapshot) => {
      let totalAvailableItems = 0;
      let totalAvailableCost = 0;
      let totalAvailableQuantity = 0;
      const lowStock = [];
      const typeCounts = {
        ingredient: 0,
        product: 0,
        derived: 0
      };
  
      snapshot.forEach((doc) => {
        const item = doc.data();
  
        totalAvailableItems += 1;
        totalAvailableCost +=
          parseFloat(item.price) * Number(item.availableQuantity) || 0;
        totalAvailableQuantity += Number(item.availableQuantity) || 0;
  
        if (item.itemType) {
          typeCounts[item.itemType] = (typeCounts[item.itemType] || 0) + 1;
        }
  
        if (Number(item.availableQuantity) <= 10) {
          lowStock.push({
            title: item.title,
            quantity: Number(item.availableQuantity),
            threshold: 10,
            type: item.itemType || "unknown"
          });
        }
      });
  
      const ingredientsSnapshot = await getDocs(ingredientsRef);
      const ingredientsCount = ingredientsSnapshot.size;
      typeCounts.ingredient += ingredientsCount;
      totalAvailableItems += ingredientsCount;
  
      ingredientsSnapshot.forEach((doc) => {
        const ingredient = doc.data();
        if (Number(ingredient.availableQuantity) <= 10) {
          lowStock.push({
            title: ingredient.title,
            quantity: Number(ingredient.availableQuantity),
            threshold: 10,
            type: "ingredient"
          });
        }
      });
  
      setTotalAvailable({
        items: totalAvailableItems,
        cost: totalAvailableCost.toFixed(2),
        quantity: totalAvailableQuantity,
      });
      setLowStockItems(lowStock);
      setInventoryStatus(typeCounts);
  
      const categoryRef = collection(db, "inventoryCategory");
      const categorySnapshot = await getDocs(categoryRef);
  
      const categories = categorySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().category,
      }));
  
      const inventorySnapshot = await getDocs(inventoryRef);
  
      const categoryData = categories.map((category) => {
        const Sales = inventorySnapshot.docs
          .filter((itemDoc) => itemDoc.data().categoryId === category.id)
          .reduce(
            (total, itemDoc) => total + (itemDoc.data().soldQuantity || 0),
            0
          );
  
        return {
          name: category.name,
          Sales,
        };
      });
      setCategoryData(categoryData);
    });
  
    // Total Sold Metrics
    const unsubscribeTotalSold = onSnapshot(invoicesRef, (snapshot) => {
      let totalSoldItems = 0;
      let totalSoldCost = 0;
      let totalSoldQuantity = 0;
      let totalPaid = 0;
      let totalUnpaid = 0;
  
      snapshot.forEach((doc) => {
        const invoice = doc.data();
        let invoiceTotalCost = 0;
  
        invoice.items.forEach((item) => {
          totalSoldItems += 1;
          const itemCost = parseFloat(item.price) * Number(item.quantity) || 0;
          invoiceTotalCost += itemCost;
          totalSoldCost += itemCost;
          totalSoldQuantity += Number(item.quantity) || 0;
        });
  
        if (invoice.isBillPaid) {
          totalPaid += invoiceTotalCost;
        } else {
          totalUnpaid += invoiceTotalCost;
        }
      });
  
      setTotalSold({
        items: totalSoldItems,
        cost: totalSoldCost.toFixed(2),
        quantity: totalSoldQuantity,
        totalPaid: totalPaid.toFixed(2),
        totalUnpaid: totalUnpaid.toFixed(2),
      });
    });
  
    getResturantPerformanceData();
  
    return () => {
      unsubscribeOrders();
      unsubscribeTotalAvailable();
      unsubscribeTotalSold();
      unsubscribePurchaseOrders();
    };
  }, []);
  

  // Combined Metrics Effect
  useEffect(() => {
    const combinedItems = (totalAvailable.items || 0) + (totalSold.items || 0);
    const combinedCost =
      (parseFloat(totalAvailable.cost) || 0) +
      (parseFloat(totalSold.cost) || 0);
    const combinedQuantity =
      (totalAvailable.quantity || 0) + (totalSold.quantity || 0);

    setTotalCombined({
      items: combinedItems,
      cost: combinedCost.toFixed(2),
      quantity: combinedQuantity,
    });
  }, [totalAvailable, totalSold]);

  const TodayOrdersTable = ({ data }) => {
    const { colors } = appTheme;

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: colors.pastelGreen }}>
              <TableCell style={{ fontWeight: "bold", color: colors.primary }}>
                Restaurant Name
              </TableCell>
              <TableCell
                style={{ fontWeight: "bold", color: colors.primary }}
                align="right"
              >
                Orders
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={row.name}
                sx={{
                  "&:nth-of-type(odd)": { backgroundColor: colors.pastelCream },
                }}
              >
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.orders}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const PendingOrdersTable = ({ data }) => {
    const { colors } = appTheme;

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: colors.pastelPeach }}>
              <TableCell style={{ fontWeight: "bold", color: colors.secondary }}>
                Order ID
              </TableCell>
              <TableCell
                style={{ fontWeight: "bold", color: colors.secondary }}
                align="right"
              >
                Date
              </TableCell>
              <TableCell
                style={{ fontWeight: "bold", color: colors.secondary }}
                align="right"
              >
                Items
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((order) => (
              <TableRow
                key={order.id}
                sx={{
                  "&:nth-of-type(odd)": { backgroundColor: colors.pastelCream },
                }}
              >
                <TableCell>{order.id.substring(0, 8)}...</TableCell>
                <TableCell align="right">{order.orderDate}</TableCell>
                <TableCell align="right">
                  {order.items.length} items
                  {JSON.stringify(order)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const { colors } = appTheme;
  const CHART_COLORS = [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.pastelGreen,
  ];

  const OrderStatusLegend = () => (
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      {orderStatusData.map((status, index) => (
        <Chip
          key={status.name}
          label={status.name}
          sx={{
            backgroundColor: CHART_COLORS[index % CHART_COLORS.length] + "20",
            color: CHART_COLORS[index % CHART_COLORS.length],
            border: `1px solid ${CHART_COLORS[index % CHART_COLORS.length]}`,
          }}
        />
      ))}
    </Stack>
  );

  const InventoryTypeLegend = () => (
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      <Chip
        label="Ingredients"
        sx={{
          backgroundColor: colors.primary + "20",
          color: colors.primary,
          border: `1px solid ${colors.primary}`,
        }}
      />
      <Chip
        label="Products"
        sx={{
          backgroundColor: colors.secondary + "20",
          color: colors.secondary,
          border: `1px solid ${colors.secondary}`,
        }}
      />
      <Chip
        label="Derived"
        sx={{
          backgroundColor: colors.accent + "20",
          color: colors.accent,
          border: `1px solid ${colors.accent}`,
        }}
      />
    </Stack>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        padding: 4,
      }}
    >
      <Paper
        sx={{
          padding: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
          borderLeft: `4px solid ${colors.primary}`,
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: colors.primary, fontWeight: 500 }}
        >
          Allow Mobile Orders
        </Typography>
        <Switch
          checked={isCutoffEnabled}
          onChange={handleToggleChange}
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": {
              color: colors.secondary,
              "&:hover": { backgroundColor: colors.pastelPeach },
            },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
              backgroundColor: colors.secondary,
            },
          }}
        />
      </Paper>

      {/* Top Row - KPI Cards */}
      <Grid container spacing={4} sx={{ marginBottom: 4 }}>
        {[
          {
            title: "Total Revenue",
            value: `£${totalSold.cost || 0}`,
            icon: <PoundSterling />,
            color: colors.primary,
          },
          {
            title: "Paid Revenue",
            value: `£${totalSold.totalPaid || 0}`,
            icon: <PoundSterling />,
            color: colors.secondary,
          },
          {
            title: "Pending Revenue",
            value: `£${totalSold.totalUnpaid || 0}`,
            icon: <PoundSterling />,
            color: colors.accent,
          },
        ].map((stat, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card
              sx={{
                boxShadow: 2,
                "&:hover": { boxShadow: 4 },
                borderTop: `4px solid ${stat.color}`,
                transition:
                  "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-5px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box sx={{ color: stat.color, marginRight: 1 }}>
                    {stat.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ color: stat.color }}
                  >
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <SalesCards />

      {/* Charts Grid */}
      <Grid container spacing={4}>
        {/* Sales Trend */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              padding: 3,
              borderRadius: 2,
              boxShadow: 2,
              "&:hover": { boxShadow: 4 },
              borderLeft: `4px solid ${colors.primary}`,
            }}
          >
            <Typography
              variant="h6"
              mb={2}
              sx={{ fontWeight: "bold", color: colors.primary }}
            >
              Weekly Sales Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `£${parseFloat(value).toFixed(2)}`,
                    "Sales",
                  ]}
                  labelFormatter={(label) => (
                    <span style={{ fontWeight: "bold" }}>{label}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="Sales"
                  stroke={colors.primary}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Order Status Distribution */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              padding: 3,
              borderRadius: 2,
              boxShadow: 2,
              "&:hover": { boxShadow: 4 },
              borderLeft: `4px solid ${colors.secondary}`,
            }}
          >
            <Typography
              variant="h6"
              mb={1}
              sx={{ fontWeight: "bold", color: colors.secondary }}
            >
              Order Status
            </Typography>
            <OrderStatusLegend />
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Today's Orders by Restaurant */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              padding: 3,
              borderRadius: 2,
              boxShadow: 2,
              "&:hover": { boxShadow: 4 },
              borderLeft: `4px solid ${colors.primary}`,
            }}
          >
            <Typography
              variant="h6"
              mb={2}
              sx={{ fontWeight: "bold", color: colors.primary }}
            >
              Today's Orders by Restaurant
            </Typography>
            <TodayOrdersTable data={todayRestaurantOrders} />
          </Paper>
        </Grid>

        {/* Pending Purchase Orders */}
        {/* <Grid item xs={12} md={6}>
          <Paper
            sx={{
              padding: 3,
              borderRadius: 2,
              boxShadow: 2,
              "&:hover": { boxShadow: 4 },
              borderLeft: `4px solid ${colors.secondary}`,
            }}
          >
            <Typography
              variant="h6"
              mb={2}
              sx={{ fontWeight: "bold", color: colors.secondary }}
            >
              Pending Purchase Orders ({pendingPurchaseOrders.length})
            </Typography>
            <PendingOrdersTable data={pendingPurchaseOrders} />
          </Paper>
        </Grid> */}

        

        {/* Inventory Type Distribution */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              padding: 3,
              borderRadius: 2,
              boxShadow: 2,
              "&:hover": { boxShadow: 4 },
              borderLeft: `4px solid ${colors.primary}`,
            }}
          >
            <Typography
              variant="h6"
              mb={1}
              sx={{ fontWeight: "bold", color: colors.primary }}
            >
              Inventory Type Distribution
            </Typography>
            <InventoryTypeLegend />
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Ingredients", value: inventoryStatus.ingredient },
                    { name: "Products", value: inventoryStatus.product },
                    { name: "Derived", value: inventoryStatus.derived },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  <Cell fill={colors.primary} />
                  <Cell fill={colors.secondary} />
                  <Cell fill={colors.accent} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Restaurant Unpaid Revenue */}
        <Grid item xs={12} md={12}>
          <Paper
            sx={{
              padding: 3,
              borderRadius: 2,
              boxShadow: 2,
              "&:hover": { boxShadow: 4 },
              borderLeft: `4px solid ${colors.accent}`,
            }}
          >
            <Typography
              variant="h6"
              mb={2}
              sx={{ fontWeight: "bold", color: colors.accent }}
            >
              Pending Revenue by Restaurant
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={restaurantUnpaidRevenue}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`£${value}`, "Pending Amount"]}
                />
                <Bar dataKey="unpaid" fill={colors.accent} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Performance */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              padding: 3,
              borderRadius: 2,
              boxShadow: 2,
              "&:hover": { boxShadow: 4 },
              borderLeft: `4px solid ${colors.secondary}`,
            }}
          >
            <Typography
              variant="h6"
              mb={2}
              sx={{ fontWeight: "bold", color: colors.secondary }}
            >
              Sales By Category
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [
                    `£${parseFloat(value).toFixed(2)}`,
                    "Sales",
                  ]}
                  labelFormatter={(label) => (
                    <span style={{ fontWeight: "bold" }}>{label}</span>
                  )}/>
                <Bar dataKey="Sales" fill={colors.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Restaurant Performance */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              padding: 3,
              borderRadius: 2,
              boxShadow: 2,
              "&:hover": { boxShadow: 4 },
              borderLeft: `4px solid ${colors.primary}`,
            }}
          >
            <Typography
              variant="h6"
              mb={2}
              sx={{ fontWeight: "bold", color: colors.primary }}
            >
              Performance by Restaurant
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={restaurantPerformance}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `£${parseFloat(value).toFixed(2)}`,
                    "Revenue",
                  ]}
                  labelFormatter={(label) => (
                    <span style={{ fontWeight: "bold" }}>{label}</span>
                  )}
                />
                <Bar dataKey="revenue" fill={colors.primary} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <TodayInvoicesGrid invoices={todayInvoices} />

        {/* Low Stock Alerts Accordion */}
        <Grid item xs={12}>
          <Accordion
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<ChevronDown />}
              sx={{ backgroundColor: colors.pastelPink }}
            >
              <Typography color={colors.accent} variant="h6" fontWeight="bold">
                Low Stock Items ({lowStockItems.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ backgroundColor: colors.pastelCream }}>
              <Grid container spacing={2}>
                {lowStockItems.map((item, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Alert
                      severity="warning"
                      sx={{
                        backgroundColor: colors.pastelPink,
                        "& .MuiAlert-icon": { color: colors.accent },
                      }}
                    >
                      <AlertTitle sx={{ fontWeight: "bold" }}>
                        {item.title} ({item.type})
                      </AlertTitle>
                      Only {item.quantity} units remaining (Threshold: {item.threshold})
                    </Alert>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;