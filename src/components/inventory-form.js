import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase-config";
import styled from "styled-components";
import appTheme from "../theme";

// Styled components
const FormContainer = styled.div`
  // max-width: 800px;
  margin: 0 auto;
  // padding: ${appTheme.spacing.lg};
  background-color: ${appTheme.colors.white};
  border-radius: ${appTheme.borderRadius.md};
  // box-shadow: ${appTheme.shadows.medium};
`;

const FormTitle = styled.h2`
  color: ${appTheme.colors.primary};
  margin-bottom: ${appTheme.spacing.lg};
  padding-bottom: ${appTheme.spacing.sm};
  border-bottom: 2px solid ${appTheme.colors.pastelGreen};
`;

const FormSection = styled.div`
  margin-bottom: ${appTheme.spacing.lg};
  padding: ${appTheme.spacing.md};
  background-color: ${appTheme.colors.pastelCream};
  border-radius: ${appTheme.borderRadius.sm};
`;

const SectionTitle = styled.h3`
  color: ${appTheme.colors.primary};
  margin-bottom: ${appTheme.spacing.md};
`;

const InputGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${appTheme.spacing.md};
  margin-bottom: ${appTheme.spacing.md};
`;

const FormField = styled.div`
  flex: 1 1 45%;
  min-width: 250px;
  margin-bottom: ${appTheme.spacing.md};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${appTheme.spacing.xs};
  color: ${appTheme.colors.dark};
  font-weight: 500;
`;

// const Input = styled.input`
//   width: 100%;
//   padding: ${appTheme.spacing.sm};
//   border: 1px solid #ddd;
//   border-radius: ${appTheme.borderRadius.sm};
//   font-size: 16px;

//   &:disabled {
//     background-color: #f5f5f5;
//     cursor: not-allowed;
//   }
// `;
// Update the Input styled component to ensure it properly handles decimals
const Input = styled.input`
  width: 100%;
  padding: ${appTheme.spacing.sm};
  border: 1px solid #ddd;
  border-radius: ${appTheme.borderRadius.sm};
  font-size: 16px;

  /* Disable number input scroll */
  &[type="number"] {
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }

  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${appTheme.spacing.sm};
  border: 1px solid #ddd;
  border-radius: ${appTheme.borderRadius.sm};
  font-size: 16px;
`;

const Button = styled.button`
  padding: ${appTheme.spacing.sm} ${appTheme.spacing.lg};
  background-color: ${(props) =>
    props.secondary ? appTheme.colors.secondary : appTheme.colors.primary};
  color: white;
  border: none;
  border-radius: ${appTheme.borderRadius.sm};
  font-weight: 500;
  cursor: pointer;
  margin-right: ${appTheme.spacing.sm};

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: ${appTheme.colors.accent};
  font-size: 14px;
  margin-top: ${appTheme.spacing.xs};
`;

const IngredientItem = styled.div`
  border: 1px solid ${appTheme.colors.pastelGreen};
  border-radius: ${appTheme.borderRadius.sm};
  padding: ${appTheme.spacing.md};
  margin-bottom: ${appTheme.spacing.md};
  background-color: ${appTheme.colors.white};
`;

const IngredientHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${appTheme.spacing.sm};
`;

// Inventory Form Component
const InventoryForm = ({ editItem,  onSubmitSuccess = () => {}, onClose   }) => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ingredientError, setIngredientError] = useState({});
  const [categories, setCategories] = useState([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      id: "",
      title: "",
      brand: "",
      vendor: "",
      categoryId: "",
      units: "",
      availableQuantity: "0",
      soldQuantity: "0",
      actualPrice: "0",
      sellingPrice: "0",
      itemType: "ingredient",
      showInMobile: false,
      ingredients: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });

  const watchItemType = watch("itemType");
  const watchIngredients = watch("ingredients");
  const watchAvailableQuantity = watch("availableQuantity");

  // Fetch ingredients on component mount
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        setLoading(true);
        const ingredientsQuery = query(collection(db, "ingredients"));
        const ingredientsSnapshot = await getDocs(ingredientsQuery);
        const ingredientsList = ingredientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setIngredients(ingredientsList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching ingredients:", err);
        setError("Failed to load ingredients");
        setLoading(false);
      }
    };

    fetchIngredients();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesQuery = query(collection(db, "inventoryCategory"));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesList = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(categoriesList);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };

    fetchCategories();
  }, []);

  // Set form values if editing an existing item
  useEffect(() => {
    if (editItem) {
      reset({
        ...editItem,
        availableQuantity: editItem.availableQuantity.toString(),
        soldQuantity: editItem.soldQuantity.toString(),
        actualPrice: editItem.actualPrice.toString(),
        sellingPrice: editItem.sellingPrice.toString(),
      });
    }
  }, [editItem, reset]);

  // Validate ingredient selection and quantity
  const validateIngredientSelection = async (data) => {
    if (data.itemType !== "derived") return true;

    const errors = {};
    const selectedIngredientIds = new Set();

    // Check for duplicate ingredients
    for (let i = 0; i < data.ingredients.length; i++) {
      const ingredient = data.ingredients[i];
      if (selectedIngredientIds.has(ingredient.ingredientId)) {
        errors[ingredient.ingredientId] = "This ingredient is already selected";
      } else {
        selectedIngredientIds.add(ingredient.ingredientId);
      }
    }

    // Check if ingredient quantities are valid
    const prevAvailableQuantity = editItem
      ? parseFloat(editItem.availableQuantity)
      : 0;
    const newAvailableQuantity = parseFloat(data.availableQuantity);
    const quantityDifference = newAvailableQuantity - prevAvailableQuantity;

    for (let i = 0; i < data.ingredients.length; i++) {
      const ingredient = data.ingredients[i];
      const ingredientDoc = ingredients.find(
        (ing) => ing.id === ingredient.ingredientId
      );

      if (!ingredientDoc) {
        errors[ingredient.ingredientId] = "Ingredient not found";
        continue;
      }

      const quantityPerUnit = parseFloat(ingredient.quantityPerUnit);

      if (isNaN(quantityPerUnit) || quantityPerUnit <= 0) {
        errors[ingredient.ingredientId] =
          "Quantity must be a positive number";
        continue;
      }

      // If it's a new entry or quantity increased
      if (!editItem || quantityDifference > 0) {
        const additionalQuantityNeeded = quantityDifference * quantityPerUnit;
        const availableIngredientQuantity = parseFloat(
          ingredientDoc.availableQuantity
        );

        if (additionalQuantityNeeded > availableIngredientQuantity) {
          errors[
            ingredient.ingredientId
          ] = `Not enough quantity available. Need ${additionalQuantityNeeded} but only ${availableIngredientQuantity} available`;
        }
      }
    }

    setIngredientError(errors);
    return Object.keys(errors).length === 0;
  };

  // Calculate total quantity used for ingredients
  const calculateTotalQuantityUsed = (ingredient, availableQuantity) => {
    const quantityPerUnit = parseFloat(ingredient.quantityPerUnit) || 0;

    if (!editItem) {
      // First time creation
      return quantityPerUnit * parseFloat(availableQuantity);
    } else {
      // Updating existing item
      const prevAvailableQuantity = parseFloat(editItem.availableQuantity) || 0;
      const newAvailableQuantity = parseFloat(availableQuantity) || 0;
      const quantityDifference = newAvailableQuantity - prevAvailableQuantity;

      const previousTotalQuantityUsed =
        editItem.ingredients?.find(
          (ing) => ing.ingredientId === ingredient.ingredientId
        )?.totalQuantityUsed || 0;

      return (
        quantityDifference * quantityPerUnit +
        parseFloat(previousTotalQuantityUsed)
      );
    }
  };

  // Update ingredient prices based on selection
  const updateIngredientPrices = (index, ingredientId) => {
    const selectedIngredient = ingredients.find(
      (ing) => ing.id === ingredientId
    );
    if (!selectedIngredient) return;

    const quantityPerUnit =
      parseFloat(watchIngredients[index]?.quantityPerUnit) || 0;
    const actualPrice =
      parseFloat(selectedIngredient.actualPrice) * quantityPerUnit;
    const sellingPrice =
      parseFloat(selectedIngredient.sellingPrice) * quantityPerUnit;

    setValue(`ingredients.${index}.units`, selectedIngredient.units);
    setValue(`ingredients.${index}.actualPrice`, actualPrice.toFixed(2));
    setValue(`ingredients.${index}.sellingPrice`, sellingPrice.toFixed(2));
  };

  // Calculate derived product prices
  useEffect(() => {
    if (watchItemType === "derived" && watchIngredients?.length > 0) {
      let totalActualPrice = 0;
      let totalSellingPrice = 0;

      watchIngredients.forEach((ingredient) => {
        totalActualPrice += parseFloat(ingredient.actualPrice) || 0;
        totalSellingPrice += parseFloat(ingredient.sellingPrice) || 0;
      });

      setValue("actualPrice", totalActualPrice.toFixed(2));
      setValue("sellingPrice", totalSellingPrice.toFixed(2));
    }
  }, [watchIngredients, watchItemType, setValue]);

  // Form submission handler
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
  
      // Validate derived item ingredients
      if (data.itemType === "derived") {
        if (!data.ingredients || data.ingredients.length === 0) {
          setError("Derived products must have at least one ingredient");
          setLoading(false);
          return;
        }
  
        let totalActualPrice = 0;
        let totalSellingPrice = 0;
  
        data.ingredients.forEach((ingredient) => {
          totalActualPrice += parseFloat(ingredient.actualPrice) || 0;
          totalSellingPrice += parseFloat(ingredient.sellingPrice) || 0;
        });
  
        data.actualPrice = totalActualPrice;
        data.sellingPrice = totalSellingPrice;
      }
  
      // Convert all number fields
      data.availableQuantity = parseFloat(data.availableQuantity) || 0;
      data.soldQuantity = parseFloat(data.soldQuantity) || 0;
      data.actualPrice = parseFloat(data.actualPrice) || 0;
      data.sellingPrice = parseFloat(data.sellingPrice) || 0;
  
      // Add/update timestamps
      data.updatedAt = new Date().toISOString();
  
      let result;
      const collectionName =
        data.itemType === "ingredient" ? "ingredients" : "inventoryItems";
  
      if (!editItem) {
        // CREATE NEW ITEM
        data.createdAt = new Date().toISOString();
        data.soldQuantity = 0;
  
        // Generate new doc ref (with ID) and set data with ID
        const newDocRef = doc(collection(db, collectionName));
        data.id = newDocRef.id;
  
        await setDoc(newDocRef, data);
        result = { ...data };
      } else {
        // UPDATE EXISTING ITEM
        if (!editItem.id) {
          throw new Error("Invalid document ID");
        }
  
        const docRef = doc(db, collectionName, editItem.id);
        const docSnap = await getDoc(docRef);
  
        if (!docSnap.exists()) {
          // Try alternate collection in case type changed
          const altCollection =
            data.itemType === "ingredient" ? "inventoryItems" : "ingredients";
          const altDocRef = doc(db, altCollection, editItem.id);
          const altDocSnap = await getDoc(altDocRef);
  
          if (altDocSnap.exists()) {
            // Move document from one collection to another
            await deleteDoc(altDocRef);
            const newDocRef = doc(db, collectionName, editItem.id);
            await setDoc(newDocRef, {
              ...data,
              id: editItem.id,
              createdAt: editItem.createdAt || new Date().toISOString(),
            });
          } else {
            throw new Error("Document not found in either collection");
          }
        } else {
          // Normal update
          await updateDoc(docRef, data);
        }
  
        result = { ...data, id: editItem.id };
      }
  
      setLoading(false);
      onSubmitSuccess(result);
      setSnackbarMessage(
        editItem ? "Item updated successfully!" : "Item created successfully!"
      );
      setSnackbarOpen(true);
      if (onClose) onClose();
    } catch (err) {
      console.error("Error saving item:", err);
      setError("Failed to save item: " + (err.message || "Unknown error"));
      setLoading(false);
    }
  };
  
  
  

  // Update ingredient quantities when a derived product is updated
  const updateIngredientQuantities = async (data, isNew) => {
    try {
      const quantityDifference = isNew 
        ? parseFloat(data.availableQuantity)
        : parseFloat(data.availableQuantity) - parseFloat(editItem.availableQuantity);
  
      if (quantityDifference === 0) return;
  
      for (const ingredient of data.ingredients) {
        const ingredientRef = doc(db, "ingredients", ingredient.ingredientId);
        const ingredientDoc = await getDoc(ingredientRef);
  
        if (ingredientDoc.exists()) {
          const ingredientData = ingredientDoc.data();
          const quantityPerUnit = parseFloat(ingredient.quantityPerUnit);
          const quantityToDeduct = quantityDifference * quantityPerUnit;
  
          let updatedAvailableQuantity = parseFloat(ingredientData.availableQuantity);
          let updatedSoldQuantity = parseFloat(ingredientData.soldQuantity);
  
          if (isNew || quantityDifference > 0) {
            // For new items or increased quantity - deduct from available, add to sold
            updatedAvailableQuantity = Math.max(
              0,
              updatedAvailableQuantity - quantityToDeduct
            );
            updatedSoldQuantity += quantityToDeduct;
          } else {
            // For decreased quantity - add back to available, deduct from sold
            updatedAvailableQuantity += Math.abs(quantityToDeduct);
            updatedSoldQuantity = Math.max(0, updatedSoldQuantity - Math.abs(quantityToDeduct));
          }
  
          await updateDoc(ingredientRef, {
            availableQuantity: updatedAvailableQuantity,
            soldQuantity: updatedSoldQuantity,
          });
        }
      }
    } catch (err) {
      console.error("Error updating ingredient quantities:", err);
      throw err;
    }
  };

  // Add a new ingredient to the derived product
  const handleAddIngredient = () => {
    append({
      id: Date.now(),
      ingredientId: "",
      title: "",
      quantityPerUnit: "0",
      totalQuantityUsed: "0",
      units: "",
      actualPrice: "0",
      sellingPrice: "0",
    });
  };


  return (
    <FormContainer>
      <FormTitle>
        {editItem ? "Edit Inventory Item" : "Add New Inventory Item"}
      </FormTitle>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection>
          <SectionTitle>Basic Information</SectionTitle>

          <InputGroup>
            <FormField>
              <Label>Item Type</Label>
              <Controller
                name="itemType"
                control={control}
                render={({ field }) => (
                  <Select {...field}>
                    <option value="ingredient">Ingredient</option>
                    <option value="product">Product</option>
                    <option value="derived">Derived Product</option>
                  </Select>
                )}
              />
            </FormField>

            <FormField>
              <Label>Title</Label>
              <Input
                {...register("title", { required: "Title is required" })}
                placeholder="Item title"
              />
              {errors.title && (
                <ErrorMessage>{errors.title.message}</ErrorMessage>
              )}
            </FormField>
          </InputGroup>

          <InputGroup>
            <FormField>
              <Label>Brand</Label>
              <Input
                {...register("brand", { required: "Brand is required" })}
                placeholder="Brand name"
              />
              {errors.brand && (
                <ErrorMessage>{errors.brand.message}</ErrorMessage>
              )}
            </FormField>

            <FormField>
              <Label>Vendor</Label>
              <Input
                {...register("vendor", { required: "Vendor is required" })}
                placeholder="Vendor name"
              />
              {errors.vendor && (
                <ErrorMessage>{errors.vendor.message}</ErrorMessage>
              )}
            </FormField>
          </InputGroup>

          <InputGroup>
            <FormField>
              <Label>Category</Label>
              <Controller
                name="categoryId"
                control={control}
                rules={{ required: "Category is required" }}
                render={({ field }) => (
                  <Select {...field}>
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.category}
                      </option>
                    ))}
                  </Select>
                )}
              />
              {errors.categoryId && (
                <ErrorMessage>{errors.categoryId.message}</ErrorMessage>
              )}
            </FormField>

            <FormField>
              <Label>Units</Label>
              <Input
                {...register("units", { required: "Units is required" })}
                placeholder="e.g. Pack, Box, Kg"
              />
              {errors.units && (
                <ErrorMessage>{errors.units.message}</ErrorMessage>
              )}
            </FormField>
          </InputGroup>

          <InputGroup>
            <FormField>
              <Label>Available Quantity</Label>
              <Input
                type="number"
                step="any"
                onWheel={(e) => e.target.blur()}
                {...register("availableQuantity", {
                  required: "Available quantity is required",
                  min: { value: 0, message: "Quantity cannot be negative" },
                })}
              />
              {errors.availableQuantity && (
                <ErrorMessage>{errors.availableQuantity.message}</ErrorMessage>
              )}
            </FormField>

            <FormField>
              <Label>Sold Quantity</Label>
              <Input
                type="number"
                step="any"
                onWheel={(e) => e.target.blur()}
                {...register("soldQuantity")}
                disabled={true}
              />
            </FormField>
          </InputGroup>

          <InputGroup>
            <FormField>
              <Label>Actual Price/Unit</Label>
              <Input
                type="number"
                step="any"
                onWheel={(e) => e.target.blur()}
                {...register("actualPrice", {
                  required: "Actual price is required",
                  min: { value: 0, message: "Price cannot be negative" },
                })}
                disabled={watchItemType === "derived"}
              />
              {errors.actualPrice && (
                <ErrorMessage>{errors.actualPrice.message}</ErrorMessage>
              )}
            </FormField>

            <FormField>
              <Label>Selling Price/Unit</Label>
              <Input
                type="number"
                step="any"
                onWheel={(e) => e.target.blur()}
                {...register("sellingPrice", {
                  required: "Selling price is required",
                  min: { value: 0, message: "Price cannot be negative" },
                })}
              />
              {errors.sellingPrice && (
                <ErrorMessage>{errors.sellingPrice.message}</ErrorMessage>
              )}
            </FormField>
          </InputGroup>

          <FormField>
            <Label>
              <Input
                type="checkbox"
                {...register("showInMobile")}
                style={{ width: "auto", marginRight: appTheme.spacing.sm }}
              />
              Show in Mobile App
            </Label>
          </FormField>
        </FormSection>

        {watchItemType === "derived" && (
          <FormSection>
            <SectionTitle>Ingredients</SectionTitle>

            {fields.map((field, index) => (
              <IngredientItem key={field.id}>
                <IngredientHeader>
                  <h4>Ingredient #{index + 1}</h4>
                  <Button type="button" onClick={() => remove(index)} secondary>
                    Remove
                  </Button>
                </IngredientHeader>

                <InputGroup>
                  <FormField>
                    <Label>Ingredient</Label>
                    <Controller
                      name={`ingredients.${index}.ingredientId`}
                      control={control}
                      rules={{ required: "Ingredient is required" }}
                      render={({ field }) => (
                        <Select
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            const selectedIngredient = ingredients.find(
                              (ing) => ing.id === e.target.value
                            );
                            if (selectedIngredient) {
                              setValue(
                                `ingredients.${index}.title`,
                                selectedIngredient.title
                              );
                            }
                            updateIngredientPrices(index, e.target.value);
                          }}
                        >
                          <option value="">Select an ingredient</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.title} ({ing.availableQuantity} {ing.units}{" "}
                              available)
                            </option>
                          ))}
                        </Select>
                      )}
                    />
                    {errors.ingredients?.[index]?.ingredientId && (
                      <ErrorMessage>
                        {errors.ingredients[index].ingredientId.message}
                      </ErrorMessage>
                    )}
                    {ingredientError[watchIngredients[index]?.ingredientId] && (
                      <ErrorMessage>
                        {ingredientError[watchIngredients[index]?.ingredientId]}
                      </ErrorMessage>
                    )}
                  </FormField>

                  <FormField>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                     step="any"
                      onWheel={(e) => e.target.blur()}
                      {...register(`ingredients.${index}.quantityPerUnit`, {
                        required: "Quantity is required",
                        min: {
                          value: 0.01,
                          message: "Quantity must be positive",
                        },
                      })}
                      onChange={(e) => {
                        register(
                          `ingredients.${index}.quantityPerUnit`
                        ).onChange(e);
                        updateIngredientPrices(
                          index,
                          watchIngredients[index]?.ingredientId
                        );
                      }}
                      placeholder="How much of this ingredient per unit"
                    />
                    {errors.ingredients?.[index]?.quantityPerUnit && (
                      <ErrorMessage>
                        {errors.ingredients[index].quantityPerUnit.message}
                      </ErrorMessage>
                    )}
                  </FormField>
                </InputGroup>

                <InputGroup>
                  <FormField>
                    <Label>Units</Label>
                    <Input
                      {...register(`ingredients.${index}.units`)}
                      disabled={true}
                    />
                  </FormField>

                  <FormField>
                    <Label>Total Quantity Used</Label>
                    <Input
                      type="number"
                      step="any"
                      onWheel={(e) => e.target.blur()}
                      value={calculateTotalQuantityUsed(
                        watchIngredients[index],
                        watchAvailableQuantity
                      )}
                      disabled={true}
                    />
                  </FormField>
                </InputGroup>

                <InputGroup>
                  <FormField>
                    <Label>Actual Price</Label>
                    <Input
                      {...register(`ingredients.${index}.actualPrice`)}
                      disabled={true}
                    />
                  </FormField>

                  <FormField>
                    <Label>Selling Price</Label>
                    <Input
                      {...register(`ingredients.${index}.sellingPrice`)}
                      disabled={true}
                    />
                  </FormField>
                </InputGroup>
              </IngredientItem>
            ))}

            <Button type="button" onClick={handleAddIngredient} secondary>
              Add Ingredient
            </Button>

            {fields.length === 0 && (
              <ErrorMessage>
                At least one ingredient is required for derived products
              </ErrorMessage>
            )}
          </FormSection>
        )}

        <InputGroup>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : editItem ? "Update Item" : "Create Item"}
          </Button>

          <Button type="button" onClick={() => reset()} secondary>
            Reset Form
          </Button>
        </InputGroup>
      </form>
    </FormContainer>
  );
};

export default InventoryForm;
