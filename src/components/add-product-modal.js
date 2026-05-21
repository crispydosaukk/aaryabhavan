import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
} from "@mui/material";
import { v4 as uuidv4 } from 'uuid';
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "../firebase-config";
import Collections from "../collections";

const AddProductModal = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    title: "",
    brand: "",
    price: "",
    vendor: "",
    quantity: "",
    categoryId: "",
    units: "", // Add units field
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

  // Modal styling
  const modalStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    overflowY: 'auto', // Scrollable if content exceeds
    borderRadius: '8px',
  };

  // Fetch categories when modal opens
  useEffect(() => {
    const fetchCategories = async () => {
      const querySnapshot = await getDocs(
        collection(db, Collections.INVENTORY_CATEGORY)
      );
      const categoriesList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesList);
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle form input changes
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});
    setError("");

    // Validate form
    const newErrors = {};
    if (!formData.title) newErrors.title = "Title is required";
    if (!formData.brand) newErrors.brand = "Brand is required";
    if (!formData.price) newErrors.price = "Price is required";
    if (!formData.vendor) newErrors.vendor = "Vendor is required";
    if (!formData.quantity) newErrors.quantity = "Quantity is required";
    if (!formData.categoryId) newErrors.categoryId = "Category is required";
    if (!formData.units) newErrors.units = "Units is required"; // Validate units field

    setErrors(newErrors);

    // If there are errors, do not submit
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);

    try {
      // Check if the product already exists
      const productQuery = query(
        collection(db, Collections.INVENTORY_ITEMS),
        where("title", "==", formData.title),
        where("brand", "==", formData.brand),
        where("vendor", "==", formData.vendor)
      );
      const productSnapshot = await getDocs(productQuery);

      if (!productSnapshot.empty) {
        setError("Product with the same title, brand, and vendor already exists, you can update quantity in inventory");
        setLoading(false);
        return;
      }

      // Generate a unique ID for the new product
      const newProductId = uuidv4();

      // Add the new product to the database
      const newProduct = {
        id: newProductId,
        ...formData,
        availableQuantity: Number(formData.quantity),
        soldQuantity: 0,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, Collections.INVENTORY_ITEMS), newProduct);

      // Clear form and close modal on success
      setFormData({
        title: "",
        brand: "",
        price: "",
        vendor: "",
        quantity: "",
        categoryId: "",
        units: "", // Reset units field
      });
      setError("");
      onClose();
    } catch (err) {
      console.error("Error adding product: ", err);
      setError("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Add Product</h2>
        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                fullWidth
                error={!!errors.title}
                helperText={errors.title}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                fullWidth
                error={!!errors.brand}
                helperText={errors.brand}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                fullWidth
                error={!!errors.price}
                helperText={errors.price}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Vendor"
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                fullWidth
                error={!!errors.vendor}
                helperText={errors.vendor}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Available Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                fullWidth
                error={!!errors.quantity}
                helperText={errors.quantity}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Category"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                fullWidth
                error={!!errors.categoryId}
                helperText={errors.categoryId}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.category}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Units"
                name="units"
                value={formData.units}
                onChange={handleChange}
                fullWidth
                error={!!errors.units}
                helperText={errors.units} // Add error message for units
              />
            </Grid>
          </Grid>

          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              style={{ width: "150px" }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Add Product"}
            </Button>
          </div>
        </form>
      </Box>
    </Modal>
  );
};

export default AddProductModal;
