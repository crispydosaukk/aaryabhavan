import React, { useState, useEffect, useMemo } from 'react';
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
  Tooltip,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import { Search, WarningAmber } from '@mui/icons-material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase-config';
import appTheme from '../theme';
import Collections from '../collections';

const PurchaseInventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const itemsPerPage = 10;

  // Styled components - fixed to avoid theme alpha issues
  const StyledTableCell = styled(TableCell)(() => ({
    fontWeight: 'bold',
    backgroundColor: appTheme.colors.primary,
    color: 'white',
    '&.MuiTableCell-body': {
      fontSize: 14,
    },
  }));

  const StyledTableRow = styled(TableRow)(() => ({
    '&:nth-of-type(odd)': {
      backgroundColor: 'rgba(240, 240, 240, 0.5)',
    },
    '&:hover': {
      backgroundColor: 'rgba(200, 240, 200, 0.2)',
    },
  }));

  const TotalRow = styled(TableRow)(() => ({
    backgroundColor: 'rgba(63, 81, 181, 0.1)',
    fontWeight: 'bold',
    '& .MuiTableCell-root': {
      fontWeight: 'bold',
      color: appTheme.colors.primary,
    },
  }));

  // Fetch data from both collections
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

    const fetchData = async () => {
      console.log('Started data fetching');
      try {
        setLoading(true);
        
        // Fetch ingredients
        const ingredientsQuery = query(collection(db, 'ingredients'));
        const ingredientsSnapshot = await getDocs(ingredientsQuery);
        const ingredientsList = ingredientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'ingredient'
        }));

        console.log('Ingredients fetched:', ingredientsList);

        // Fetch products (itemType = "product" or "derived")
        const productsQuery = query(
          collection(db, 'inventoryItems'),
          where('itemType', 'in', ['product'])
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsList = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'product'
        }));

        console.log('Products fetched:', productsList);
        
        const combinedItems = [...ingredientsList, ...productsList];
        console.log('Combined items:', combinedItems);
        setItems(combinedItems);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    console.log('Filtering items:', items);
    let result = items;
    
    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter(item => item.type === filterType);
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.title && item.title.toLowerCase().includes(searchLower)) ||
        (item.brand && item.brand.toLowerCase().includes(searchLower)) ||
        (item.vendor && item.vendor.toLowerCase().includes(searchLower))
      );
    }
    
    console.log('Filtered items:', result);
    return result;
  }, [items, filterType, searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const availableQty = Number(item.availableQuantity) || 0;
      const soldQty = Number(item.soldQuantity) || 0;
      const actualPrice = Number(item.actualPrice) || 0;
      const sellingPrice = Number(item.sellingPrice) || 0;
      
      return {
        availableQuantity: acc.availableQuantity + availableQty,
        soldQuantity: acc.soldQuantity + soldQty,
        totalActualCost: acc.totalActualCost + (availableQty * actualPrice),
        totalSellingValue: acc.totalSellingValue + (availableQty * sellingPrice),
        totalSoldValue: acc.totalSoldValue + (soldQty * sellingPrice),
      };
    }, {
      availableQuantity: 0,
      soldQuantity: 0,
      totalActualCost: 0,
      totalSellingValue: 0,
      totalSoldValue: 0
    });
  }, [filteredItems]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Paginated items
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredItems, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchTerm]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: appTheme.colors.primary }}>
        Purchase Inventory
      </Typography>

      {/* Summary Cards */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3,
        flexWrap: 'wrap',
        justifyContent: 'space-between'
      }}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 2, 
            flex: '1 1 200px', 
            bgcolor: 'rgba(150, 230, 150, 0.3)',
            borderRadius: 2
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">Total Items</Typography>
          <Typography variant="h5" fontWeight="bold">{filteredItems.length}</Typography>
        </Paper>
        
        <Paper 
          elevation={2} 
          sx={{ 
            p: 2, 
            flex: '1 1 200px', 
            bgcolor: 'rgba(100, 180, 230, 0.3)',
            borderRadius: 2
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">Available Quantity</Typography>
          <Typography variant="h5" fontWeight="bold">{totals.availableQuantity}</Typography>
        </Paper>
        
        <Paper 
          elevation={2} 
          sx={{ 
            p: 2, 
            flex: '1 1 200px', 
            bgcolor: 'rgba(255, 180, 150, 0.3)',
            borderRadius: 2
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">Total Inventory Cost</Typography>
          <Typography variant="h5" fontWeight="bold">{formatCurrency(totals.totalActualCost)}</Typography>
        </Paper>
        
        <Paper 
          elevation={2} 
          sx={{ 
            p: 2, 
            flex: '1 1 200px', 
            bgcolor: 'rgba(255, 240, 200, 0.3)',
            borderRadius: 2
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">Potential Revenue</Typography>
          <Typography variant="h5" fontWeight="bold">{formatCurrency(totals.totalSellingValue)}</Typography>
        </Paper>
      </Box>

      {/* Filters */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' }
      }}>
        <TextField
          fullWidth
          label="Search Items"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search color="action" sx={{ mr: 1 }} />,
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: appTheme.colors.primary,
              },
              '&.Mui-focused fieldset': {
                borderColor: appTheme.colors.primary,
              },
            },
          }}
        />

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
      </Box>

      {/* Items Table */}
      <Paper elevation={3} sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <StyledTableCell>Type</StyledTableCell>
                <StyledTableCell>Title</StyledTableCell>
                <StyledTableCell>Brand/Vendor</StyledTableCell>
                <StyledTableCell>Category</StyledTableCell>
                <StyledTableCell>Units</StyledTableCell>
                <StyledTableCell align="right">Available</StyledTableCell>
                <StyledTableCell align="right">Sold</StyledTableCell>
                <StyledTableCell align="right">Actual Price</StyledTableCell>
                <StyledTableCell align="right">Selling Price</StyledTableCell>
                <StyledTableCell align="right">Total Cost</StyledTableCell>
                <StyledTableCell align="right">Total Value</StyledTableCell>
                <StyledTableCell>Updated</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={50} sx={{ color: appTheme.colors.primary }} />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length > 0 ? (
                <>
                  {paginatedItems.map((item) => {
                    const availableQty = Number(item.availableQuantity) || 0;
                    const soldQty = Number(item.soldQuantity) || 0;
                    const actualPrice = Number(item.actualPrice) || 0;
                    const sellingPrice = Number(item.sellingPrice) || 0;
                    const totalCost = availableQty * actualPrice;
                    const totalValue = availableQty * sellingPrice;
                    
                    return (
                      <StyledTableRow key={`${item.type}-${item.id}`}>
                        <TableCell>
                          <Chip
                            label={item.type === 'ingredient' ? 'Ingredient' : 'Product'}
                            sx={{
                              backgroundColor: 
                                item.type === 'ingredient' 
                                  ? 'rgba(150, 230, 150, 0.7)'
                                  : 'rgba(255, 180, 150, 0.7)',
                              color: '#333',
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                        <TableCell>{item.title || '-'}</TableCell>
                        <TableCell>
                          {item.brand || '-'}
                          {item.vendor && item.vendor !== item.brand && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {item.vendor}
                            </Typography>
                          )}
                        </TableCell>
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
                        <TableCell>{item.units || '-'}</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end">
                            {availableQty}
                            {availableQty < 10 && (
                              <Tooltip title="Low stock">
                                <WarningAmber
                                  color="warning"
                                  fontSize="small"
                                  sx={{ ml: 1 }}
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{soldQty}</TableCell>
                        <TableCell align="right">{formatCurrency(actualPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(sellingPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(totalCost)}</TableCell>
                        <TableCell align="right">{formatCurrency(totalValue)}</TableCell>
                        <TableCell>{formatDate(item.updatedAt)}</TableCell>
                      </StyledTableRow>
                    );
                  })}
                  
                  {/* Total Row - Only visible on first page */}
                  {currentPage === 1 && (
                    <TotalRow>
                      <TableCell colSpan={5}>TOTALS</TableCell>
                      <TableCell align="right">{totals.availableQuantity}</TableCell>
                      <TableCell align="right">{totals.soldQuantity}</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">{formatCurrency(totals.totalActualCost)}</TableCell>
                      <TableCell align="right">{formatCurrency(totals.totalSellingValue)}</TableCell>
                      <TableCell>-</TableCell>
                    </TotalRow>
                  )}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1">
                      {searchTerm ? 'No matching items found' : 'No items available'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {filteredItems.length > itemsPerPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={Math.ceil(filteredItems.length / itemsPerPage)}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default PurchaseInventory;