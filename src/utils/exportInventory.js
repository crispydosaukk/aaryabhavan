import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../firebase-config";

const exportToExcel = async () => {
  try {
    // Fetch all necessary data
    const inventorySnapshot = await getDocs(collection(db, "inventoryItems"));
    const ingredientSnapshot = await getDocs(collection(db, "ingredients"));
    const categorySnapshot = await getDocs(collection(db, "inventoryCategory"));

    // Create a map of category IDs to category names
    const categoryMap = {};
    categorySnapshot.forEach(doc => {
      categoryMap[doc.id] = doc.data().category;
    });

    const inventoryData = [];
    const ingredientsData = [];

    inventorySnapshot.forEach(doc => {
      const data = doc.data();
      const { ingredients, ...rest } = data;

      // Get category name from the map, fallback to ID if not found
      const categoryName = categoryMap[data.categoryId] || data.categoryId;

      // Push main inventory item
      inventoryData.push({
        id: doc.id,
        title: data.title,
        brand: data.brand,
        vendor: data.vendor,
        category: categoryName, // Now using the category name instead of ID
        actualPrice: data.actualPrice,
        sellingPrice: data.sellingPrice,
        availableQuantity: data.availableQuantity,
        soldQuantity: data.soldQuantity,
        units: data.units,
        showInMobile: data.showInMobile,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        itemType: data.itemType,
      });

      // Push each ingredient used in this inventory item
      if (Array.isArray(ingredients)) {
        ingredients.forEach((ing, idx) => {
          ingredientsData.push({
            parentInventoryId: doc.id,
            parentTitle: data.title,
            ingredientIndex: idx + 1,
            ingredientId: ing.ingredientId,
            title: ing.title,
            actualPrice: ing.actualPrice,
            sellingPrice: ing.sellingPrice,
            quantityPerUnit: ing.quantityPerUnit,
            totalQuantityUsed: ing.totalQuantityUsed,
            units: ing.units,
          });
        });
      }
    });

    // Extract flat ingredients data (if needed from second collection)
    const ingredientsRaw = ingredientSnapshot.docs.map(doc => {
      const data = doc.data();
      const categoryName = categoryMap[data.categoryId] || data.categoryId || 'N/A';
      return {
        ...data,
        id: doc.id,
        category: categoryName, // This shows the category name!
      };
    });

    // Create a workbook
    const workbook = XLSX.utils.book_new();

    const inventorySheet = XLSX.utils.json_to_sheet(inventoryData);
    const usedIngredientsSheet = XLSX.utils.json_to_sheet(ingredientsData);
    const masterIngredientsSheet = XLSX.utils.json_to_sheet(ingredientsRaw);

    XLSX.utils.book_append_sheet(workbook, inventorySheet, "Inventory Items");
    XLSX.utils.book_append_sheet(workbook, usedIngredientsSheet, "Used Ingredients");
    XLSX.utils.book_append_sheet(workbook, masterIngredientsSheet, "Master Ingredients");

    XLSX.writeFile(workbook, "Inventory_and_Ingredients.xlsx");
  } catch (error) {
    console.error("Error exporting to Excel: ", error);
  }
};

export default exportToExcel;