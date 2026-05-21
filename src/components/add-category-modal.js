import React, { useEffect, useState } from "react";
import { 
  Modal, 
  Box, 
  TextField, 
  Button, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from "@mui/material";
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  setDoc,
  where,
  updateDoc,
  writeBatch,
  deleteDoc
} from "firebase/firestore";
import { db, storage } from "../firebase-config";
import Collections from "../collections";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Delete } from "@mui/icons-material";

const AddCategoryModal = ({ open, onClose }) => {
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [updateClicked, setUpdateClicked] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [itemsInCategory, setItemsInCategory] = useState([]);
  const [migrationCategory, setMigrationCategory] = useState("");
  const [migrationLoading, setMigrationLoading] = useState(false);

  const fetchCategories = async () => {
    const categoryQuery = query(collection(db, Collections.INVENTORY_CATEGORY));
    const querySnapshot = await getDocs(categoryQuery);
    const categoriesList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setCategories(categoriesList);
  };

  const fetchItemsInCategory = async (categoryId) => {
    const itemsQuery = query(
      collection(db, Collections.INVENTORY_ITEMS),
      where("categoryId", "==", categoryId)
    );
    const querySnapshot = await getDocs(itemsQuery);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);

    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!category) {
      setError("Please provide a category name");
      return;
    }

    if (!isEditing && !image) {
      setError("Please select an image for the category");
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        // EDIT EXISTING CATEGORY
        const categoryToUpdate = categories.find(
          (cat) => cat.id === editingCategoryId
        );

        if (!categoryToUpdate) {
          throw new Error("Category to update not found in local state");
        }

        const categoryData = {
          ...categoryToUpdate,
          category,
          updatedAt: new Date().toISOString(),
        };

        if (image) {
          // Delete old image if it exists
          if (categoryToUpdate.image) {
            const oldImageRef = ref(
              storage,
              `categories/${editingCategoryId}.jpg`
            );
            await deleteObject(oldImageRef).catch(console.error);
          }

          // Upload new image
          const newImageRef = ref(
            storage,
            `categories/${editingCategoryId}.jpg`
          );
          await uploadBytes(newImageRef, image);
          categoryData.image = await getDownloadURL(newImageRef);
        }

        await setDoc(
          doc(db, Collections.INVENTORY_CATEGORY, editingCategoryId),
          categoryData
        );
      } else {
        // ADD NEW CATEGORY
        const newDocRef = doc(collection(db, Collections.INVENTORY_CATEGORY));
        const imageRef = ref(storage, `categories/${newDocRef.id}.jpg`);
        await uploadBytes(imageRef, image);
        const downloadURL = await getDownloadURL(imageRef);

        const categoryData = {
          id: newDocRef.id,
          category,
          image: downloadURL,
          createdAt: new Date().toISOString(),
          updatedAt: null,
        };

        await setDoc(newDocRef, categoryData);
      }

      // Reset and close
      setCategory("");
      setImage(null);
      setImagePreview(null);
      setError("");
      fetchCategories();
      if (!updateClicked) {
        onClose();
      } else {
        setUpdateClicked(false);
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setError(
        err.message.includes("not found")
          ? "Category not found - please refresh and try again"
          : "Failed to save category"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (category) => {
    const items = await fetchItemsInCategory(category.id);
    setItemsInCategory(items);
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      setMigrationLoading(true);
      
      // If there are items in this category and no migration category selected
      if (itemsInCategory.length > 0 && !migrationCategory) {
        setError("Please select a category to migrate items to");
        return;
      }

      // If there are items and a migration category is selected
      if (itemsInCategory.length > 0 && migrationCategory) {
        const batch = writeBatch(db);
        
        // Update all items to the new category
        itemsInCategory.forEach(item => {
          const itemRef = doc(db, Collections.INVENTORY_ITEMS, item.id);
          batch.update(itemRef, { categoryId: migrationCategory });
        });
        
        await batch.commit();
      }

      // Delete the category
      await deleteDoc(doc(db, Collections.INVENTORY_CATEGORY, categoryToDelete.id));

      // Delete the category image from storage if it exists
      if (categoryToDelete.image) {
        const imageRef = ref(storage, `categories/${categoryToDelete.id}.jpg`);
        await deleteObject(imageRef).catch(console.error);
      }

      // Reset and refresh
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      setItemsInCategory([]);
      setMigrationCategory("");
      fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      setError("Failed to delete category: " + err.message);
    } finally {
      setMigrationLoading(false);
    }
  };

  const handleEditClick = (category) => {
    setCategory(category.category);
    setImagePreview(category.image);
    setEditingCategoryId(category.id);
    setIsEditing(true);
    setUpdateClicked(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(!isEditing);
    setCategory("");
    setImage(null);
    setImagePreview(null);
    setEditingCategoryId(null);
    setUpdateClicked(false);
  };

  const renderCategoryList = () => (
    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
      {categories.map((cat) => (
        <div
          key={cat.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
            padding: "8px",
            border: "1px solid #eee",
            borderRadius: "4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {cat.image && (
              <img 
                src={cat.image} 
                alt={cat.category} 
                style={{ width: "40px", height: "40px", objectFit: "cover" }}
              />
            )}
            <span>{cat.category}</span>
          </div>
          <div>
            <Button 
              onClick={() => handleEditClick(cat)} 
              variant="outlined"
              size="small"
              style={{ marginRight: "8px" }}
            >
              Edit
            </Button>
            <Button
              onClick={() => handleDeleteClick(cat)}
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Delete fontSize="small" />}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box sx={modalStyle}>
          <h2>{isEditing ? "Edit Category" : "Add Category"}</h2>
          {(!isEditing || updateClicked) ? (
            <form onSubmit={handleSubmit}>
              <TextField
                label="Category Name"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                fullWidth
                margin="normal"
              />
              <input
                type="file"
                onChange={handleImageChange}
                style={{ marginTop: "20px" }}
              />
              {imagePreview && (
                <div style={{ marginTop: "20px", textAlign: "center" }}>
                  <img
                    src={imagePreview}
                    alt="Category Preview"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              )}
              {error && <p style={{ color: "red" }}>{error}</p>}
              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : "Save Changes"}
                </Button>
                <Button
                  onClick={() => {
                    onClose();
                    setCategory("");
                    setImage(null);
                    setImagePreview(null);
                    setEditingCategoryId(null);
                    setUpdateClicked(false);
                  }}
                  variant="outlined"
                  color="secondary"
                  style={{ marginLeft: "10px" }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div>
              {renderCategoryList()}
              <Button
                onClick={handleCancelEdit}
                variant="outlined"
                color="secondary"
                style={{ marginTop: "20px" }}
              >
                Cancel Edit
              </Button>
            </div>
          )}
          <Button
            onClick={() => {
              if(updateClicked){
                setIsEditing(true);
              }else{
                setIsEditing(!isEditing);
              }
              setUpdateClicked(() => false);
            }}
            variant="outlined"
            style={{ position: "absolute", top: 16, right: 16 }}
          >
            {isEditing ? "Add Category" : "Edit Categories"}
          </Button>
        </Box>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the category "{categoryToDelete?.category}"?
          </DialogContentText>
          
          {itemsInCategory.length > 0 && (
            <>
              <Typography variant="body1" sx={{ mt: 2 }}>
                There are {itemsInCategory.length} items in this category. 
                Please select a new category to move these items to:
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select Category</InputLabel>
                <Select
                  value={migrationCategory}
                  onChange={(e) => setMigrationCategory(e.target.value)}
                  label="Select Category"
                >
                  {categories
                    .filter(cat => cat.id !== categoryToDelete?.id)
                    .map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.category}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </>
          )}

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeleteConfirmOpen(false);
              setError("");
            }}
            disabled={migrationLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            disabled={migrationLoading || (itemsInCategory.length > 0 && !migrationCategory)}
          >
            {migrationLoading ? (
              <CircularProgress size={24} />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: "500px",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 3,
  borderRadius: "8px",
  maxHeight: "90vh",
  overflowY: "auto",
};

export default AddCategoryModal;