import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  TextField,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Grid,
  Tooltip,
  Badge,
  InputAdornment,
  Snackbar,
  Alert,
  Stack,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  Search,
  Add,
  ShoppingCart,
  History,
  Delete,
  Edit,
  Refresh,
  Download,
  ArrowBack,
  Save,
  Close,
  WarningAmber,
  AttachMoney,
} from "@mui/icons-material";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  orderBy,
  Timestamp,
  onSnapshot, setDoc,
  deleteDoc,
  writeBatch,
  increment,
  deleteField
} from "firebase/firestore";
import { db } from "../firebase-config";
import appTheme from "../theme";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import Collections from "../collections";

// Styled components
const StyledTableCell = styled(TableCell)(() => ({
  fontWeight: "bold",
  backgroundColor: appTheme.colors.primary,
  color: appTheme.colors.white,
  "&.MuiTableCell-body": {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(() => ({
  "&:nth-of-type(odd)": {
    backgroundColor: "rgba(240, 240, 240, 0.5)",
  },
  "&:hover": {
    backgroundColor: "rgba(197, 225, 165, 0.2)",
  },
}));

const CartItemRow = styled(TableRow)(() => ({
  backgroundColor: "rgba(197, 225, 165, 0.3)",
}));

const HistoryItemRow = styled(TableRow)(() => ({
  backgroundColor: "rgba(255, 224, 178, 0.3)",
  "&:hover": {
    backgroundColor: "rgba(255, 224, 178, 0.5)",
  },
}));

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const PriceEditDialog = ({ open, item, onClose, onSave }) => {
  const [prices, setPrices] = useState({
    actualPrice: item?.actualPrice || 0,
    sellingPrice: item?.sellingPrice || 0,
  });

  useEffect(() => {
    if (item) {
      setPrices({
        actualPrice: item.actualPrice || 0,
        sellingPrice: item.sellingPrice || 0,
      });
    }
  }, [item]);

  const handleSave = () => {
    onSave({
      ...item,
      actualPrice: parseFloat(prices.actualPrice),
      sellingPrice: parseFloat(prices.sellingPrice),
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Prices - {item?.title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Actual Price"
            type="number"
            value={prices.actualPrice}
            onChange={(e) =>
              setPrices({ ...prices, actualPrice: e.target.value })
            }
            fullWidth
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">£</InputAdornment>
              ),
            }}
          />
          <TextField
            label="Selling Price"
            type="number"
            value={prices.sellingPrice}
            onChange={(e) =>
              setPrices({ ...prices, sellingPrice: e.target.value })
            }
            fullWidth
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">£</InputAdornment>
              ),
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error">
          Cancel
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Save Prices
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const PurchaseOrder = () => {
  const [tabValue, setTabValue] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [orderHistory, setOrderHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendors, setVendors] = useState([]);
  const [openCartDialog, setOpenCartDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [lowStockFilter, setLowStockFilter] = useState(false);
    const [categories, setCategories] = useState([]);
  const [cartId, setCartId] = useState(null); // To track the current cart document ID
const [initialLoad, setInitialLoad] = useState(true); // To prevent duplicate loads
const [openPriceDialog, setOpenPriceDialog] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState(null);

// Save cart to Firestore
const saveCartToFirestore = async (cartItems) => {
    try {
      const cartData = {
        items: cartItems,
        updatedAt: Timestamp.now(),
        vendor: cartItems[0]?.vendor || selectedVendor || ''
      };
  
      if (cartId) {
        // Update existing cart
        await updateDoc(doc(db, 'adminOrderCart', cartId), cartData);
      } else {
        // Create new cart
        const docRef = await addDoc(collection(db, 'adminOrderCart'), cartData);
        setCartId(docRef.id);
        localStorage.setItem('currentCartId', docRef.id); // Store in localStorage
      }
    } catch (error) {
      console.error('Error saving cart:', error);
      showSnackbar('Failed to save cart', 'error');
    }
  };
  
  // Load cart from Firestore
  const loadCartFromFirestore = async () => {
    try {
      const savedCartId = localStorage.getItem('currentCartId');
      if (!savedCartId) return;
  
      const docRef = doc(db, 'adminOrderCart', savedCartId);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const cartData = docSnap.data();
        setCart(cartData.items || []);
        setCartId(savedCartId);
        if (cartData.items.length > 0) {
          setSelectedVendor(cartData.vendor || '');
        }
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      showSnackbar('Failed to load saved cart', 'error');
    } finally {
      setInitialLoad(false);
    }
  };

  // Fetch data on component load
  useEffect(() => {
    const fetchCategories = async () => {
            try {
              const categorySnapshot = await getDocs(
                collection(db, Collections.INVENTORY_CATEGORY)
              );
              const categoriesData = categorySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              setCategories(categoriesData);
            } catch (error) {
              console.error("Error fetching categories: ", error);
            }
          };
      
          fetchCategories();
    const fetchItems = async () => {
        await loadCartFromFirestore();
      try {
        setLoading(true);

        // Fetch ingredients
        const ingredientsQuery = query(collection(db, "ingredients"));
        const ingredientsSnapshot = await getDocs(ingredientsQuery);
        const ingredientsList = ingredientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          type: "ingredient",
          orderQuantity: 0,
        }));

        // Fetch products
        const productsQuery = query(
          collection(db, "inventoryItems"),
          where("itemType", "in", ["product", "derived"])
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsList = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          type: "product",
          orderQuantity: 0,
        }));

        // Extract unique vendors
        const allVendors = new Set();
        [...ingredientsList, ...productsList].forEach((item) => {
          if (item.vendor) allVendors.add(item.vendor);
        });

        setVendors(Array.from(allVendors));
        setItems([...ingredientsList, ...productsList]);
      } catch (error) {
        console.error("Error fetching items:", error);
        showSnackbar("Failed to load items", "error");
      } finally {
        setLoading(false);
      }
    };

    const fetchOrderHistory = async () => {
      try {
        setLoadingHistory(true);
        const ordersQuery = query(
          collection(db, "purchaseOrders"),
          orderBy("orderDate", "desc")
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersList = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          orderDate: doc.data().orderDate?.toDate() || new Date(),
        }));
        setOrderHistory(ordersList);
      } catch (error) {
        console.error("Error fetching order history:", error);
        showSnackbar("Failed to load order history", "error");
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchItems();
    fetchOrderHistory();
    if (cartId) {
        const unsubscribe = onSnapshot(doc(db, 'adminOrderCart', cartId), (doc) => {
          if (doc.exists()) {
            const cartData = doc.data();
            setCart(cartData.items || []);
          }
        });
        
        return () => unsubscribe();
      }
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Apply vendor filter
    if (selectedVendor) {
      result = result.filter(item => item.vendor === selectedVendor);
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter(item => item.type === filterType);
    }
    
    // Apply low stock filter
    if (lowStockFilter) {
      result = result.filter(item => {
        const availableQty = Number(item.availableQuantity) || 0;
        return availableQty < 15; // Consider items with less than 10 as low stock
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.title && item.title.toLowerCase().includes(searchLower)) ||
        (item.brand && item.brand.toLowerCase().includes(searchLower)) ||
        (item.categoryId && item.categoryId.toLowerCase().includes(searchLower))
      );
    }
    
    return result;
  }, [items, selectedVendor, filterType, searchTerm, lowStockFilter]);

  

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle quantity change
  const handleQuantityChange = (itemId, value) => {
    // Allow empty string (when user is deleting)
    if (value === "") {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, orderQuantity: "" } : item
        )
      );
      return;
    }
  
    // Convert to number and ensure it's not negative
    const numValue = Math.max(0, parseInt(value, 10) || 0);
    
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, orderQuantity: numValue } : item
      )
    );
  };

  // Add item to cart
const addToCart = async (item) => {
    if (item.orderQuantity <= 0) {
      showSnackbar('Please specify a quantity greater than 0', 'warning');
      return;
    }
    
    const updatedCart = [...cart];
    const existingItemIndex = updatedCart.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex >= 0) {
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        orderQuantity: item.orderQuantity
      };
    } else {
      updatedCart.push({ ...item });
    }
    
    setCart(updatedCart);
    await saveCartToFirestore(updatedCart);
    showSnackbar(`Updated ${item.title} in cart`, 'success');
  };
  
  // Updated removeFromCart function
  const removeFromCart = async (itemId) => {
    const updatedCart = cart.filter(item => item.id !== itemId);
    setCart(updatedCart);
    await saveCartToFirestore(updatedCart);
    showSnackbar('Item removed from cart', 'info');
  };
  
  // Updated placeOrder function (add this at the end after successful order)
  const clearCart = async () => {
    if (cartId) {
      try {
        await deleteDoc(doc(db, 'adminOrderCart', cartId));
        localStorage.removeItem('currentCartId');
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
    setCart([]);
    setCartId(null);
  };

  // Show shopping cart dialog
  const showCartDialog = () => {
    setOpenCartDialog(true);
  };

  // Close shopping cart dialog
  const closeCartDialog = () => {
    setOpenCartDialog(false);
  };

  const cancelOrderEdit = () => {
    setCart([]); // Clear the cart
    closeCartDialog();
    showSnackbar('Order edit canceled', 'info');
  };

  // Show order history dialog
  const showOrderHistoryDialog = (order) => {
    setSelectedOrder(order);
    setOpenHistoryDialog(true);
  };

  // Close order history dialog
  const closeOrderHistoryDialog = () => {
    setOpenHistoryDialog(false);
    setSelectedOrder(null);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  // Show snackbar alert
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar alert
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Place order
  const placeOrder = async () => {
    if (cart.length === 0) {
      showSnackbar("Your cart is empty", "warning");
      return;
    }

    try {
      const orderItems = cart.map((item) => ({
        id: item.id,
        title: item.title,
        brand: item.brand,
        vendor: item.vendor,
        quantity: item.orderQuantity,
        units: item.units,
        type: item.type,
        actualPrice: item.actualPrice,
        sellingPrice: item.sellingPrice,
      }));

      const newOrder = {
        orderItems,
        orderDate: Timestamp.now(),
        status: "pending",
        vendor: orderItems[0].vendor,
        totalValue: orderItems.reduce(
          (sum, item) => sum + (item.actualPrice || 0) * item.quantity,
          0
        ),
      };

      const docRef = await addDoc(collection(db, "purchaseOrders"), newOrder);

      // Update history and clear cart
      setOrderHistory((prev) => [
        {
          id: docRef.id,
          ...newOrder,
          orderDate: new Date(),
        },
        ...prev,
      ]);

      await generateOrderPDF({
        id: docRef.id,
        ...newOrder,
        orderDate: new Date(),
      });

      await clearCart();
      closeCartDialog();
      showSnackbar("Order placed successfully", "success");
    } catch (error) {
      console.error("Error placing order:", error);
      showSnackbar("Failed to place order", "error");
    }
  };

  const markAsReceived = async (order) => {
    try {
      const batch = writeBatch(db);

      // Update each item in inventory
      order.orderItems.forEach((item) => {
        const itemRef = doc(db, "inventoryItems", item.id);
        batch.update(itemRef, {
          availableQuantity: increment(item.quantity),
          actualPrice: item.actualPrice,
          sellingPrice: item.sellingPrice,
          lastUpdated: Timestamp.now(),
        });
      });

      // Update order status
      const orderRef = doc(db, "purchaseOrders", order.id);
      batch.update(orderRef, {
        status: "completed",
        receivedDate: Timestamp.now(),
      });

      await batch.commit();

      // Update local state
      setOrderHistory((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "completed",
                receivedDate: new Date(),
              }
            : o
        )
      );

      showSnackbar("Order marked as received!", "success");
    } catch (error) {
      console.error("Error receiving order:", error);
      showSnackbar("Failed to mark order as received", "error");
    }
  };

  const handlePriceSave = async (updatedItem) => {
    try {
      // Determine which collection to update based on item type
      const collectionName = updatedItem.type === "ingredient" 
        ? "ingredients" 
        : "inventoryItems";
  
      await updateDoc(doc(db, collectionName, updatedItem.id), {
        actualPrice: updatedItem.actualPrice,
        sellingPrice: updatedItem.sellingPrice,
      });
  
      // Update local state
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === updatedItem.id
            ? {
                ...item,
                actualPrice: updatedItem.actualPrice,
                sellingPrice: updatedItem.sellingPrice,
              }
            : item
        )
      );
  
      // Also update cart if this item is in cart
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === updatedItem.id
            ? {
                ...item,
                actualPrice: updatedItem.actualPrice,
                sellingPrice: updatedItem.sellingPrice,
              }
            : item
        )
      );
  
      showSnackbar("Prices updated successfully", "success");
    } catch (error) {
      console.error("Error updating prices:", error);
      showSnackbar("Failed to update prices", "error");
    }
  };



  // Generate PDF for order
  const generateOrderPDF = async (order) => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const { width, height } = page.getSize();
      const margin = 50;
      let y = height - margin;
      const lineHeight = 20;

      // Header
      page.drawText("PURCHASE ORDER", {
        x: margin,
        y,
        size: 24,
        font: boldFont,
        color: rgb(0.2, 0.4, 0.2), // Dark green
      });

      y -= lineHeight * 2;

      // Order info
      page.drawText(`Order Number: ${order.id}`, {
        x: margin,
        y,
        size: 12,
        font,
      });
      y -= lineHeight;

      page.drawText(`Date: ${formatDate(order.orderDate)}`, {
        x: margin,
        y,
        size: 12,
        font,
      });
      y -= lineHeight;

      if (order.vendor) {
        page.drawText(`Vendor: ${order.vendor}`, {
          x: margin,
          y,
          size: 12,
          font,
        });
        y -= lineHeight;
      }

      y -= lineHeight;

      // Table header
      const columnWidths = [40, 200, 80, 80, 100];
      const columnPositions = columnWidths.reduce((acc, width, index) => {
        const prevPos = index > 0 ? acc[index - 1] : margin;
        return [...acc, prevPos + (index > 0 ? columnWidths[index - 1] : 0)];
      }, []);

      // Draw header background
      page.drawRectangle({
        x: margin,
        y: y - lineHeight,
        width: columnWidths.reduce((acc, w) => acc + w, 0),
        height: lineHeight + 5,
        color: rgb(0.2, 0.4, 0.2),
      });

      // Draw header text
      const headerLabels = ["#", "Item", "Units", "Quantity", "Notes"];
      headerLabels.forEach((label, index) => {
        page.drawText(label, {
          x: columnPositions[index],
          y: y - 15,
          size: 12,
          font: boldFont,
          color: rgb(1, 1, 1), // White
        });
      });

      y -= lineHeight + 10;

      // Draw items
      order.orderItems.forEach((item, index) => {
        if (y < margin + 60) {
          // Add new page if running out of space
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }

        const rowData = [
          (index + 1).toString(),
          item.title,
          item.units || "",
          item.quantity.toString(),
          "",
        ];

        // Draw row background (alternating)
        if (index % 2 === 0) {
          page.drawRectangle({
            x: margin,
            y: y - lineHeight,
            width: columnWidths.reduce((acc, w) => acc + w, 0),
            height: lineHeight + 5,
            color: rgb(0.95, 0.95, 0.95),
          });
        }

        // Draw row text
        rowData.forEach((text, colIndex) => {
          page.drawText(text, {
            x: columnPositions[colIndex],
            y: y - 15,
            size: 11,
            font,
          });
        });

        y -= lineHeight + 5;
      });

      // Footer
      y = margin + 50;
      page.drawText(`Total Items: ${order.orderItems.length}`, {
        x: margin,
        y,
        size: 12,
        font: boldFont,
      });

      y -= lineHeight * 3;

      // Signature lines
      page.drawLine({
        start: { x: margin, y },
        end: { x: margin + 150, y },
        thickness: 1,
      });

      page.drawText("Authorized Signature", {
        x: margin,
        y: y - 15,
        size: 10,
        font,
      });

      page.drawLine({
        start: { x: width - margin - 150, y },
        end: { x: width - margin, y },
        thickness: 1,
      });

      page.drawText("Vendor Confirmation", {
        x: width - margin - 150,
        y: y - 15,
        size: 10,
        font,
      });

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      saveAs(blob, `PurchaseOrder_${order.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      showSnackbar("Failed to generate PDF", "error");
    }
  };

  // Repeat order
  const repeatOrder = (order) => {
    const orderItems = order.orderItems.map((item) => {
      // Find the full item details
      const fullItem = items.find((i) => i.id === item.id) || {
        id: item.id,
        title: item.title,
        brand: item.brand,
        vendor: item.vendor,
        type: item.type,
        units: item.units,
      };

      return {
        ...fullItem,
        orderQuantity: item.quantity,
      };
    });

    setCart(orderItems);
    closeOrderHistoryDialog();
    showCartDialog();
    showSnackbar("Order added to cart", "success");
  };

  // Edit order for reordering
  const editOrder = (order) => {
    // Similar to repeat but let user edit
    repeatOrder(order);
  };


// In your main component

const handleSaveOrder = async (updatedOrder) => {
  try {
    const batch = writeBatch(db); // batch for ingredients/inventoryItems updates

    // Update each order item in its respective collection
    for (const item of updatedOrder.orderItems) {
      const collectionName = item.type === 'ingredient' ? 'ingredients' : 'inventoryItems';
      const itemRef = doc(db, collectionName, item.id);

      // Optionally check if the document exists before updating
      const itemSnap = await getDoc(itemRef);
      if (itemSnap.exists()) {
        batch.update(itemRef, {
          actualPrice: item.actualPrice,
          sellingPrice: item.sellingPrice,
          lastUpdated: Timestamp.now()
        });
      } else {
        console.warn(`Item with ID ${item.id} not found in ${collectionName}`);
      }
    }

    // Update the purchase order itself
    const orderRef = doc(db, 'purchaseOrders', updatedOrder.id);
    await updateDoc(orderRef, {
      orderItems: updatedOrder.orderItems.map(item => ({
        id: item.id,
        title: item.title,
        brand: item.brand,
        quantity: item.quantity,
        type: item.type,
        units: item.units,
        vendor: item.vendor,
        actualPrice: item.actualPrice,
        sellingPrice: item.sellingPrice
      })),
      lastUpdated: Timestamp.now()
    });

    // Commit all ingredient/inventory updates
    await batch.commit();

    // Update local state
    setOrderHistory(prev => prev.map(order =>
      order.id === updatedOrder.id ? updatedOrder : order
    ));

    showSnackbar('Order and related items updated successfully', 'success');
  } catch (error) {
    console.error('Error updating order and items:', error);
    showSnackbar('Failed to update order or related items', 'error');
  }
};

const handleMarkAsReceived = async (orderId, receivedItems) => {
  try {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    let allItemsExist = true;
    const missingItems = [];

    // Check each item in both collections
    await Promise.all(
      receivedItems.map(async (item) => {
        // First try ingredients collection
        let docRef = doc(db, 'ingredients', item.id);
        let docSnap = await getDoc(docRef);

        // If not found in ingredients, try inventoryItems
        if (!docSnap.exists()) {
          docRef = doc(db, 'inventoryItems', item.id);
          docSnap = await getDoc(docRef);
        }

        if (!docSnap.exists()) {
          allItemsExist = false;
          missingItems.push(`${item.title || 'Untitled Item'} (${item.id})`);
          return;
        }

        // Prepare the update for this item
        batch.update(docRef, {
          availableQuantity: increment(item.quantity),
          actualPrice: item.actualPrice,
          sellingPrice: item.sellingPrice,
          lastUpdated: now
        });
      })
    );

    if (!allItemsExist) {
      showSnackbar(
        `Cannot mark as received - missing items: ${missingItems.join(', ')}`,
        'error'
      );
      return;
    }

    // Update order status
    const orderRef = doc(db, 'purchaseOrders', orderId);
    batch.update(orderRef, {
      status: 'received',
      receivedDate: now,
      receivedItems: receivedItems.map(item => ({
        id: item.id,
        receivedQuantity: item.quantity,
        actualPrice: item.actualPrice,
        sellingPrice: item.sellingPrice
      }))
    });

    await batch.commit();

    // Update local state
    setOrderHistory(prev => prev.map(order => 
      order.id === orderId
        ? {
            ...order,
            status: 'received',
            receivedDate: now.toDate(),
            receivedItems
          }
        : order
    ));
    closeOrderHistoryDialog()
    showSnackbar('Order marked as received and inventory updated', 'success');
  } catch (error) {
    console.error('Error receiving order:', error);
    showSnackbar(`Failed to update inventory: ${error.message}`, 'error');
  }
};

const handleRemoveFromInventory = async (orderId) => {
  try {
    const order = orderHistory.find(o => o.id === orderId);

    if (!order || !Array.isArray(order.receivedItems) || order.receivedItems.length === 0) {
      showSnackbar('No received items to remove from inventory', 'error');
      return;
    }

    const batch = writeBatch(db);
    const now = Timestamp.now();
    let allItemsExist = true;
    const missingItems = [];

    // Check each item in both collections
    await Promise.all(
      order.receivedItems.map(async (item) => {
        // First try ingredients collection
        let docRef = doc(db, 'ingredients', item.id);
        let docSnap = await getDoc(docRef);

        // If not found in ingredients, try inventoryItems
        if (!docSnap.exists()) {
          docRef = doc(db, 'inventoryItems', item.id);
          docSnap = await getDoc(docRef);
        }

        if (!docSnap.exists()) {
          allItemsExist = false;
          missingItems.push(`${item.title || 'Untitled Item'} (${item.id})`);
          return;
        }

        batch.update(docRef, {
          availableQuantity: increment(-item.receivedQuantity),
          lastUpdated: now
        });
      })
    );

    if (!allItemsExist) {
      showSnackbar(
        `Cannot revert inventory - missing items: ${missingItems.join(', ')}`,
        'error'
      );
      return;
    }

    // Update order status
    const orderRef = doc(db, 'purchaseOrders', orderId);
    batch.update(orderRef, {
      status: 'pending',
      receivedDate: deleteField(),
      receivedItems: deleteField(),
      lastUpdated: now
    });

    await batch.commit();

    // Update local state
    setOrderHistory(prev => prev.map(order =>
      order.id === orderId
        ? {
            ...order,
            status: 'pending',
            receivedDate: null,
            receivedItems: null
          }
        : order
    ));
    closeOrderHistoryDialog()
    showSnackbar('Inventory quantities reverted', 'success');
  } catch (error) {
    console.error('Error reverting inventory:', error);
    showSnackbar(`Failed to revert inventory: ${error.message}`, 'error');
  }
};


const OrderDetailsDialog = ({ 
  order, 
  onClose, 
  onSaveOrder, 
  onMarkAsReceived,
  onRemoveFromInventory 
}) => {
  const [editing, setEditing] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [priceEdits, setPriceEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // Track item to be deleted

  // Fetch current prices when dialog opens
  useEffect(() => {
    const fetchItemPrices = async () => {
      if (!order) return;
      
      setLoadingPrices(true);
      const itemsWithPrices = await Promise.all(
        order.orderItems.map(async item => {
          try {
            const collectionName = item.type === 'ingredient' 
              ? 'ingredients' 
              : 'inventoryItems';
            
            const docRef = doc(db, collectionName, item.id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              return {
                ...item,
                actualPrice: data.actualPrice || 0,
                sellingPrice: data.sellingPrice || 0
              };
            }
            return item;
          } catch (error) {
            console.error(`Error fetching prices for ${item.id}:`, error);
            return item;
          }
        })
      );
      
      setEditedItems(itemsWithPrices);
      
      // Initialize price edits
      const initialPriceEdits = {};
      itemsWithPrices.forEach(item => {
        initialPriceEdits[item.id] = {
          actualPrice: item.actualPrice ?? '',
          sellingPrice: item.sellingPrice ?? ''
        };
      });
      setPriceEdits(initialPriceEdits);
      setLoadingPrices(false);
    };

    fetchItemPrices();
  }, [order]);

  const handleQuantityChange = (itemId, value) => {
    setEditedItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity: Math.max(0, parseInt(value)) }
        : item
    ));
  };

  const handlePriceChange = (itemId, field, value) => {
    if (value === '') {
      setPriceEdits(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: ''
        }
      }));
      return;
    }

    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setPriceEdits(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: numValue
        }
      }));
    }
  };

  const handleDeleteItem = (itemId) => {
    setConfirmDelete(itemId);
  };

  const confirmDeleteItem = () => {
    setEditedItems(prev => prev.filter(item => item.id !== confirmDelete));
    setPriceEdits(prev => {
      const newPriceEdits = {...prev};
      delete newPriceEdits[confirmDelete];
      return newPriceEdits;
    });
    setConfirmDelete(null);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const updatedOrder = {
        ...order,
        orderItems: editedItems.map(item => ({
          ...item,
          quantity: item.quantity,
          actualPrice: priceEdits[item.id]?.actualPrice || item.actualPrice || 0,
          sellingPrice: priceEdits[item.id]?.sellingPrice || item.sellingPrice || 0
        })),
        lastUpdated: Timestamp.now()
      };
      
      await onSaveOrder(updatedOrder);
      setEditing(false);
      onClose()
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReceived = async () => {
    setSaving(true);
    try {
      const itemsWithUpdatedPrices = editedItems.map(item => ({
        ...item,
        actualPrice: priceEdits[item.id]?.actualPrice || item.actualPrice || 0,
        sellingPrice: priceEdits[item.id]?.sellingPrice || item.sellingPrice || 0
      }));
      await onMarkAsReceived(order.id, itemsWithUpdatedPrices);
    } finally {
      setSaving(false);
    }
  };

  const isReceived = order?.status === 'received';

  return (
    <>
      <Dialog open={!!order} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          Order Details - {order?.id.substring(0, 8)}...
          {order?.receivedDate && (
            <Typography variant="caption" color="textSecondary">
              Received on: {formatDate(order.receivedDate)}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {loadingPrices ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <StyledTableCell>Item</StyledTableCell>
                    <StyledTableCell>Original Qty</StyledTableCell>
                    {editing && <StyledTableCell>New Qty</StyledTableCell>}
                    <StyledTableCell>Actual Price</StyledTableCell>
                    <StyledTableCell>Selling Price</StyledTableCell>
                    {editing && <StyledTableCell>Actions</StyledTableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{order.orderItems.find(i => i.id === item.id)?.quantity} {item.units}</TableCell>
                      
                      {editing && (
                        <TableCell>
                          <TextField
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            size="small"
                            // inputProps={{ min: 0 }}
                          />
                        </TableCell>
                      )}
                      
                      <TableCell>
                        <TextField
                          type="number"
                          value={priceEdits[item.id]?.actualPrice ?? ''}
                          onChange={(e) => handlePriceChange(item.id, 'actualPrice', e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              handlePriceChange(item.id, 'actualPrice', '0');
                            }
                          }}
                          size="small"
                          InputProps={{ startAdornment: '£' }}
                          disabled={!editing && !isReceived}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <TextField
                          type="number"
                          value={priceEdits[item.id]?.sellingPrice ?? ''}
                          onChange={(e) => handlePriceChange(item.id, 'sellingPrice', e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              handlePriceChange(item.id, 'sellingPrice', '0');
                            }
                          }}
                          size="small"
                          InputProps={{ startAdornment: '£' }}
                          disabled={!editing && !isReceived}
                        />
                      </TableCell>

                      {editing && (
                        <TableCell align="center">
                          <IconButton
                            onClick={() => handleDeleteItem(item.id)}
                            color="error"
                            size="small"
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Close</Button>
          
          {!isReceived && (
            <>
              {editing ? (
                <>
                  <Button 
                    onClick={() => setEditing(false)} 
                    color="secondary"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveOrder}
                    color="primary"
                    variant="contained"
                    disabled={saving || editedItems.length === 0}
                  >
                    {saving ? <CircularProgress size={24} /> : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setEditing(true)}
                  color="secondary"
                  disabled={saving}
                >
                  Edit Order
                </Button>
              )}
              
              <Button 
                onClick={handleMarkReceived}
                color="success"
                variant="contained"
                disabled={editing || saving || editedItems.length === 0}
              >
                {saving ? <CircularProgress size={24} /> : 'Mark as Received'}
              </Button>
            </>
          )}
          
          {isReceived && (
            <Button 
              onClick={() => onRemoveFromInventory(order.id)}
              color="error"
              variant="contained"
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : 'Remove from Inventory'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this item from the order?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteItem}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

  // Calculate cart total
  const cartItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + 1, 0);
  }, [cart]);

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" sx={{ color: appTheme.colors.primary }}>
          Purchase Orders
        </Typography>

        <Box>
          <Tooltip title="View Cart">
            <IconButton
              color="primary"
              onClick={showCartDialog}
              sx={{
                bgcolor: cart.length
                  ? "rgba(197, 225, 165, 0.3)"
                  : "transparent",
              }}
            >
              <Badge badgeContent={cartItemCount} color="secondary">
                <ShoppingCart />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Paper
        elevation={2}
        sx={{ mb: 3, borderRadius: appTheme.borderRadius.md }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            "& .MuiTabs-indicator": {
              backgroundColor: appTheme.colors.primary,
            },
            "& .Mui-selected": {
              color: `${appTheme.colors.primary} !important`,
            },
          }}
        >
          <Tab icon={<Add />} label="New Order" />
          <Tab icon={<History />} label="Order History" />
        </Tabs>

        {/* New Order Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                mb: 3,
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              <TextField
                fullWidth
                label="Search Items"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1 }}
              />

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Vendor</InputLabel>
                <Select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  label="Vendor"
                >
                  <MenuItem value="">All Vendors</MenuItem>
                  {vendors.map((vendor) => (
                    <MenuItem key={vendor} value={vendor}>
                      {vendor}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Type"
                >
                  <MenuItem value="all">All Items</MenuItem>
                  <MenuItem value="ingredient">Ingredients</MenuItem>
                  <MenuItem value="product">Products</MenuItem>
                </Select>
              </FormControl>
              <Button
    variant={lowStockFilter ? "contained" : "outlined"}
    onClick={() => setLowStockFilter(!lowStockFilter)}
    color={lowStockFilter ? "warning" : "primary"}
    sx={{ minWidth: 120 }}
    startIcon={<WarningAmber />}
  >
    Low Stock
  </Button>
            </Box>

            <TableContainer
              component={Paper}
              sx={{ boxShadow: appTheme.shadows.small }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <StyledTableCell>Type</StyledTableCell>
                    <StyledTableCell>Title</StyledTableCell>
                    <StyledTableCell>Brand/Vendor</StyledTableCell>
                    <StyledTableCell>Category</StyledTableCell>
                    <StyledTableCell>Units</StyledTableCell>
                    <StyledTableCell align="right">
                      Current Stock
                    </StyledTableCell>
                    <StyledTableCell>Actual Price/unit</StyledTableCell>
                    <StyledTableCell>Selling Price/unit</StyledTableCell>
                    <StyledTableCell>Order Quantity</StyledTableCell>
                    {/* <StyledTableCell>Total Value</StyledTableCell> */}
                    <StyledTableCell align="center">Actions</StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <CircularProgress
                          size={50}
                          sx={{ color: appTheme.colors.primary }}
                        />
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const isInCart = cart.some(
                        (cartItem) => cartItem.id === item.id
                      );

                      return (
                        <StyledTableRow
                          key={item.id}
                          sx={
                            isInCart
                              ? { bgcolor: "rgba(197, 225, 165, 0.2)" }
                              : {}
                          }
                        >
                          <TableCell>
                            <Chip
                              label={
                                item.type === "ingredient"
                                  ? "Ingredient"
                                  : "Product"
                              }
                              size="small"
                              sx={{
                                backgroundColor:
                                  item.type === "ingredient"
                                    ? "rgba(197, 225, 165, 0.7)"
                                    : "rgba(255, 224, 178, 0.7)",
                                color: appTheme.colors.dark,
                              }}
                            />
                          </TableCell>
                          <TableCell>{item.title || "-"}</TableCell>
                          <TableCell>
                            {item.brand || "-"}
                            {item.vendor && item.vendor !== item.brand && (
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                              >
                                {item.vendor}
                              </Typography>
                            )}
                          </TableCell>
                          {/* <TableCell>{item.categoryId || "-"}</TableCell> */}
                          <TableCell>
                                                  <Chip
                                                    label={
                                                      categories.find(
                                                        (cat) => cat.id === item.categoryId
                                                      )?.category || "N/A"
                                                    }
                                                    size="small"
                                                    sx={{
                                                      backgroundColor: alpha(
                                                        appTheme.colors.primary,
                                                        0.1
                                                      ),
                                                      color: appTheme.colors.primary,
                                                      borderRadius: appTheme.borderRadius.sm,
                                                      fontWeight:'bold'
                                                    }}
                                                  />
                                                </TableCell>
                          <TableCell>{item.units || "-"}</TableCell>
                          <TableCell align="right">
                            {item.availableQuantity || 0}
                          </TableCell>
                          <TableCell>{item.actualPrice || '-'}</TableCell>
                          <TableCell>{item.sellingPrice || '-'}</TableCell>
                          {/* <TableCell>{item.availableQuantity * item.costPrice || '-'}</TableCell> */}
                          <TableCell>
                            <TextField
                              type="number"
                              variant="outlined"
                              size="small"
                              value={item.orderQuantity}
                              onChange={(e) =>
                                handleQuantityChange(item.id, e.target.value)
                              }
                              onWheel={(e) => e.target.blur()}
                              inputProps={{ min: 0 }}
                              sx={{ width: "80px" }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant={isInCart ? "outlined" : "contained"}
                              color={isInCart ? "success" : "primary"}
                              size="small"
                              onClick={() => addToCart(item)}
                              startIcon={isInCart ? <Edit /> : <Add />}
                              sx={{
                                bgcolor: isInCart
                                  ? "transparent"
                                  : appTheme.colors.primary,
                                "&:hover": {
                                  bgcolor: isInCart
                                    ? "rgba(197, 225, 165, 0.2)"
                                    : undefined,
                                },
                              }}
                            >
                              {isInCart ? "Update" : "Add"}
                            </Button>
                            <Button
                              variant={"outlined" }
                              color={isInCart ? "success" : "primary"}
                              size="small"
                              onClick={() => {
                                setCurrentEditingItem(item);
                              setOpenPriceDialog(true);
                              }}
                              startIcon={<Edit />}
                              sx={{
                                bgcolor: isInCart
                                  ? "transparent"
                                  : appTheme.colors.primary,
                                "&:hover": {
                                  bgcolor: isInCart
                                    ? "rgba(197, 225, 165, 0.2)"
                                    : undefined,
                                },
                                marginTop:"2px"
                              }}
                            >
                              {"Edit"}
                            </Button>
                          </TableCell>
                          {/* <TableCell align="center">
                          <IconButton
                            onClick={() => {
                              setCurrentEditingItem(item);
                              setOpenPriceDialog(true);
                            }}
                            color="primary"
                          >
                            <AttachMoney />
                          </IconButton>
                        </TableCell> */}
                        </StyledTableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography>
                          {searchTerm || selectedVendor
                            ? "No matching items found"
                            : "No items available"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Order History Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Orders
            </Typography>

            {loadingHistory ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress
                  size={50}
                  sx={{ color: appTheme.colors.primary }}
                />
              </Box>
            ) : orderHistory.length > 0 ? (
              <TableContainer
                component={Paper}
                sx={{ boxShadow: appTheme.shadows.small }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <StyledTableCell>Order ID</StyledTableCell>
                      <StyledTableCell>Date</StyledTableCell>
                      <StyledTableCell>Vendor</StyledTableCell>
                      <StyledTableCell align="right">Items</StyledTableCell>
                      <StyledTableCell>Status</StyledTableCell>
                      <StyledTableCell align="center">Actions</StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderHistory.map((order) => (
                      <HistoryItemRow key={order.id}>
                        <TableCell>
                          <Typography
                            sx={{
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                            onClick={() => showOrderHistoryDialog(order)}
                          >
                            {order.id.substring(0, 8)}...
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(order.orderDate)}</TableCell>
                        <TableCell>{order.vendor || "-"}</TableCell>
                        <TableCell align="right">
                          {order.orderItems?.length || 0}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.status || "pending"}
                            size="small"
                            sx={{
                              backgroundColor:
                                order.status === "received"
                                  ? "rgba(197, 225, 165, 0.7)"
                                  : order.status === "cancelled"
                                  ? "rgba(255, 205, 210, 0.7)"
                                  : "rgba(255, 224, 178, 0.7)",
                              color: appTheme.colors.dark,
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="center"
                          >
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => showOrderHistoryDialog(order)}
                                sx={{ color: appTheme.colors.primary }}
                              >
                                <Search fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Repeat Order">
                              <IconButton
                                size="small"
                                onClick={() => repeatOrder(order)}
                                sx={{ color: appTheme.colors.secondary }}
                              >
                                <Refresh fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download PDF">
                              <IconButton
                                size="small"
                                onClick={() => generateOrderPDF(order)}
                                sx={{ color: appTheme.colors.accent }}
                              >
                                <Download fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </HistoryItemRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography>No order history found</Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Shopping Cart Dialog */}
      <Dialog
        open={openCartDialog}
        onClose={closeCartDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ bgcolor: appTheme.colors.primary, color: "white" }}>
          Shopping Cart
        </DialogTitle>
        <DialogContent dividers>
          {cart.length > 0 ? (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Review your order before submitting
              </Typography>

              <TableContainer
                component={Paper}
                sx={{ mt: 2, boxShadow: appTheme.shadows.small }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <StyledTableCell>Item</StyledTableCell>
                      <StyledTableCell>Vendor</StyledTableCell>
                      <StyledTableCell>Units</StyledTableCell>
                      <StyledTableCell align="right">Quantity</StyledTableCell>
                      <StyledTableCell align="center">Actions</StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cart.map((item) => (
                      <CartItemRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2">{item.title}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {item.type === "ingredient"
                              ? "Ingredient"
                              : "Product"}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.vendor || "-"}</TableCell>
                        <TableCell>{item.units || "-"}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            variant="outlined"
                            size="small"
                            value={item.orderQuantity}
                            onChange={(e) => {
                              const newCart = cart.map((cartItem) =>
                                cartItem.id === item.id
                                  ? {
                                      ...cartItem,
                                      orderQuantity:
                                        parseInt(e.target.value, 10),
                                    }
                                  : cartItem
                              );
                              setCart(newCart);
                            }}
                            inputProps={{ min: 1 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => removeFromCart(item.id)}
                            sx={{ color: appTheme.colors.error }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </CartItemRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography variant="body1" color="textSecondary">
                Your cart is empty
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={closeCartDialog}
            startIcon={<Close />}
            sx={{ color: appTheme.colors.error }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={placeOrder}
            startIcon={<Save />}
            disabled={cart.length === 0}
            sx={{
              bgcolor: appTheme.colors.primary,
              "&:hover": { bgcolor: appTheme.colors.primaryDark },
            }}
          >
            Place Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order History Dialog */}
      <OrderDetailsDialog
  order={selectedOrder}
  onClose={closeOrderHistoryDialog}
  onSaveOrder={handleSaveOrder}
  onMarkAsReceived={handleMarkAsReceived}
  onRemoveFromInventory={handleRemoveFromInventory}
/>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <PriceEditDialog
        open={openPriceDialog}
        item={currentEditingItem}
        onClose={() => setOpenPriceDialog(false)}
        onSave={handlePriceSave}
      />
    </Box>
  );
};

export default PurchaseOrder;
