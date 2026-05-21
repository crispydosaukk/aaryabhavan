import { collection, getDocs } from "firebase/firestore";

const fetchRestaurantPerformance = async (db) => {
  try {
    // Fetch all restaurants from the `users` collection
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);

    // Create a map of restaurant IDs to their names
    const restaurants = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().restaurantName,
    }));

    // Fetch all invoices from the `invoices` collection
    const invoicesRef = collection(db, "invoices");
    const invoicesSnapshot = await getDocs(invoicesRef);

    // Aggregate orders and revenue for each restaurant
    const restaurantPerformance = restaurants.map((restaurant) => {
      const restaurantInvoices = invoicesSnapshot.docs.filter(
        (invoiceDoc) => invoiceDoc.data().userId === restaurant.id
      );

      const orders = restaurantInvoices.length;
      const revenue = restaurantInvoices.reduce((total, invoiceDoc) => {
        const items = invoiceDoc.data().items || [];
        const totalRevenueForInvoice = items.reduce(
          (sum, item) => sum + parseFloat(item.price) * item.quantity,
          0
        );
        return total + totalRevenueForInvoice;
      }, 0);

      return {
        name: restaurant.name,
        orders,
        revenue: parseFloat(revenue.toFixed(2)), // Ensure the revenue is a number with 2 decimal places
      };
    });

    return restaurantPerformance;
  } catch (error) {
    console.error("Error fetching restaurant performance data: ", error);
    throw error;
  }
};

export default fetchRestaurantPerformance;
