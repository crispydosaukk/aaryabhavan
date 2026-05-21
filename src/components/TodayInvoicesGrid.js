import React, { useEffect, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import * as XLSX from "xlsx";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const theme = createTheme({
  palette: {
    primary: {
      main: "#dc2626",
    },
    secondary: {
      main: "#eab308",
    },
  },
});


const TodayInvoicesGrid = ({ invoices = [] }) => {
  const [items, setItems] = useState({});
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState({});
  // State to track scroll position
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const fetchCategories = async () => {
      const db = getFirestore();
      const categoriesSnapshot = await getDocs(collection(db, "inventoryCategory"));
      const categoriesData = {};
      
      categoriesSnapshot.forEach((doc) => {
        categoriesData[doc.id] = doc.data().category;
      });
      
      setCategories(categoriesData);
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (invoices && invoices.length > 0 && Object.keys(categories).length > 0) {
      processInvoices();
    }
  }, [invoices, categories]);

  // Add effect to update category headers position when scrolling
  useEffect(() => {
    const categoryHeaders = document.querySelectorAll('.category-label');
    categoryHeaders.forEach(header => {
      if (header) {
        header.style.transform = `translateX(${scrollPosition}px)`;
      }
    });
  }, [scrollPosition]);

  // Handle scroll event
  const handleScroll = (e) => {
    setScrollPosition(e.target.scrollLeft);
  };

  const processInvoices = async () => {
    try {
      setLoading(true);
      
      // Collect all unique items across invoices
      const uniqueItems = new Set();
      invoices.forEach((invoice) =>
        invoice.items.forEach((item) => uniqueItems.add(item.title))
      );

      const itemList = Array.from(uniqueItems).map((title) => ({ title }));

      // Get unique restaurant names
      const restaurantNames = [...new Set(invoices.map(invoice => invoice.restaurantName))];

      // Generate restaurant-wise item quantities
      const restaurantGrid = restaurantNames.map((restaurantName) => {
        const orders = invoices.filter(
          (invoice) => invoice.restaurantName === restaurantName
        );

        const itemQuantities = itemList.map((item) => {
          const quantity = orders
            .flatMap((order) => order.items)
            .filter((orderItem) => orderItem.title === item.title)
            .reduce((sum, orderItem) => sum + (orderItem.quantity || 0), 0);
          return { title: item.title, quantity };
        });

        return { restaurantName, itemQuantities };
      });

      // Categorize items using categoryId from items
      const categorizedItems = {};

      invoices.forEach((invoice) => {
        invoice.items.forEach((item) => {
          // Get category name from categories map using categoryId
          const categoryName = categories[item.categoryId] || "Uncategorized";

          if (!categorizedItems[categoryName]) {
            categorizedItems[categoryName] = [];
          }

          if (!categorizedItems[categoryName].some((i) => i.title === item.title)) {
            categorizedItems[categoryName].push(item);
          }
        });
      });

      setItems(categorizedItems);
      setData(restaurantGrid);
    } catch (error) {
      console.error("Error processing invoices: ", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheetData = [];

    // Header row
    const headers = ["Item", ...data.map((d) => d.restaurantName), "Total"];
    worksheetData.push(headers);

    // Iterate over categories and items
    Object.entries(items).forEach(([category, categoryItems]) => {
      // Add category row (spanning columns)
      worksheetData.push([category, ...Array(data.length + 1).fill("")]);

      // Add items within category
      categoryItems.forEach((item) => {
        const row = [item.title];
        let rowTotal = 0;

        data.forEach((restaurant) => {
          const quantity =
            restaurant.itemQuantities.find((q) => q.title === item.title)
              ?.quantity || 0;
          row.push(quantity);
          rowTotal += quantity;
        });

        row.push(rowTotal);
        worksheetData.push(row);
      });
    });

    // Grand Total Row
    const totalRow = ["Total"];
    let grandTotal = 0;

    data.forEach((restaurant) => {
      const restaurantTotal = restaurant.itemQuantities.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      totalRow.push(restaurantTotal);
      grandTotal += restaurantTotal;
    });

    totalRow.push(grandTotal);
    worksheetData.push(totalRow);

    // Convert to worksheet and save
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, "todays_invoices.xlsx");
  };

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    });

    const headers = ["Item", ...data.map((d) => d.restaurantName), "Total"];
    const rows = [];

    Object.entries(items).forEach(([category, categoryItems]) => {
      // Add category row
      rows.push([category, ...Array(data.length + 1).fill("")]);
      
      // Add items
      categoryItems.forEach((item) => {
        const row = [item.title];
        let rowTotal = 0;

        data.forEach((restaurant) => {
          const quantity =
            restaurant.itemQuantities.find((q) => q.title === item.title)
              ?.quantity || 0;
          row.push(quantity);
          rowTotal += quantity;
        });

        row.push(rowTotal);
        rows.push(row);
      });
    });

    doc.setFontSize(20);
    doc.text("Today's Invoice Grid", doc.internal.pageSize.getWidth() / 2, 15, {
      align: "center",
    });

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 25,
      theme: "grid",
      didDrawCell: (data) => {
        // Skip drawing for category rows (they're merged cells)
        if (data.cell.raw === "" && data.row.index % 2 === 0) {
          data.cell.styles.fillColor = [220, 220, 220];
        }
      },
    });

    doc.save("todays_invoices.pdf");
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={300}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Box p={2}>
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{
            "& .MuiAlert-icon": {
              color: theme.palette.primary.main,
            },
          }}
        >
          <AlertTitle>No Orders Found</AlertTitle>
          There are no orders for today. New orders will appear here as they
          come in.
        </Alert>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Paper
        elevation={3}
        sx={{
          p: 3,
          marginLeft: "3.5%",
          marginTop: "15px",
          maxWidth: "95%",
        }}
      >
        <Typography
          variant="h4"
          color="text.primary"
          align="center"
          gutterBottom
          sx={{ fontWeight: "bold" }}
        >
          Today's Invoice Grid
        </Typography>

        {/* Table Container */}
        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
            position: "relative",
            "&::-webkit-scrollbar": {
              height: "8px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "#f1f1f1",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#888",
              borderRadius: "4px",
            },
          }}
          onScroll={handleScroll}
        >
          <table
            id="invoice-table"
            style={{
              minWidth: "100%",
              width: "max-content",
              borderCollapse: "collapse",
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                    backgroundColor: "#e8f5e9",
                    color: "#1976d2",
                    padding: "16px",
                    border: "1px solid #ffffff",
                    minWidth: "150px",
                    maxWidth: "250px",
                    whiteSpace: "normal",
                    wordWrap: "break-word",
                  }}
                >
                  Item
                </th>
                {data.map((restaurant, index) => (
                  <th
                    key={index}
                    style={{
                      backgroundColor: "#e8f5e9",
                      color: "#1976d2",
                      padding: "16px",
                      border: "1px solid #ffffff",
                      minWidth: "150px",
                      maxWidth: "200px",
                      whiteSpace: "normal",
                      wordWrap: "break-word",
                    }}
                  >
                    {restaurant.restaurantName}
                  </th>
                ))}
                <th
                  style={{
                    backgroundColor: "#e8f5e9",
                    color: "#1976d2",
                    padding: "16px",
                    border: "1px solid #ffffff",
                    minWidth: "70px",
                    position: "sticky",
                    right: 0,
                    zIndex: 3,
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(items).map(([category, categoryItems], catIndex) => (
                <React.Fragment key={catIndex}>
                  {/* Category Divider with fixed position */}
                  <tr>
                    <td
                      colSpan={data.length + 2}
                      style={{
                        position: "relative",
                        padding: 0,
                        height: "40px",
                        backgroundColor: "#f8f9fa",
                      }}
                    >
                      {/* Fixed Category Label - this will stay in place during scroll */}
                      <div 
                        className="category-label" 
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          zIndex: 4,
                          backgroundColor: "#f8f9fa",
                          fontWeight: "bold",
                          textAlign: "left",
                          padding: "10px",
                          border: "1px solid #ddd",
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {category}
                      </div>
                    </td>
                  </tr>

                  {/* Render Items in Category */}
                  {categoryItems.map((item, index) => {
                    const total = data.reduce((sum, restaurant) => {
                      const quantity =
                        restaurant.itemQuantities.find(
                          (q) => q.title === item.title
                        )?.quantity || 0;
                      return sum + quantity;
                    }, 0);

                    return (
                      <tr key={index}>
                        {/* Sticky Item Column */}
                        <td
                          style={{
                            padding: "16px",
                            border: "1px solid #ddd",
                            fontWeight: "500",
                            position: "sticky",
                            left: 0,
                            backgroundColor: "#fff",
                            zIndex: 2,
                          }}
                        >
                          {item.title}
                        </td>

                        {/* Restaurant Data */}
                        {data.map((restaurant, i) => (
                          <td
                            key={i}
                            style={{
                              padding: "16px",
                              border: "1px solid #ddd",
                              textAlign: "center",
                            }}
                          >
                            {restaurant.itemQuantities.find(
                              (q) => q.title === item.title
                            )?.quantity || "-"}
                          </td>
                        ))}

                        {/* Sticky Total Column */}
                        <td
                          style={{
                            padding: "16px",
                            border: "1px solid #ddd",
                            fontWeight: "bold",
                            textAlign: "center",
                            position: "sticky",
                            right: 0,
                            backgroundColor: "#fff",
                            zIndex: 2,
                          }}
                        >
                          {total}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* Grand Total Row */}
              <tr style={{ backgroundColor: "#f1f1f1", fontWeight: "bold" }}>
                <td
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#f1f1f1",
                    zIndex: 2,
                  }}
                >
                  Total
                </td>

                {data.map((restaurant, i) => {
                  const grandTotal = restaurant.itemQuantities.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  );
                  return (
                    <td
                      key={i}
                      style={{
                        padding: "16px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        backgroundColor: "#f1f1f1",
                      }}
                    >
                      {grandTotal}
                    </td>
                  );
                })}

                <td
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    fontWeight: "bold",
                    textAlign: "center",
                    position: "sticky",
                    right: 0,
                    backgroundColor: "#f1f1f1",
                    zIndex: 2,
                  }}
                >
                  {data.reduce(
                    (sum, restaurant) =>
                      sum +
                      restaurant.itemQuantities.reduce(
                        (s, i) => s + i.quantity,
                        0
                      ),
                    0
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={downloadPDF}
            sx={{ minWidth: 150 }}
            startIcon={<PictureAsPdfIcon />}
          >
            Download PDF
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={downloadExcel}
            sx={{ minWidth: 150 }}
            startIcon={<TableChartIcon />}
          >
            Download Excel
          </Button>
        </Box>
      </Paper>
    </ThemeProvider>
  );
};

export default TodayInvoicesGrid;