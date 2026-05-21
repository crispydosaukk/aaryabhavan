import React, { useState, useRef, useEffect } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase-config";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  TableHead,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import html2pdf from "html2pdf.js";
import LOGO from "../assets/abLogo.png";

const InvoiceModal = ({ invoice, isModalOpen, handleClose }) => {
  const [editableInvoice, setEditableInvoice] = useState(invoice);
  const [editingIndex, setEditingIndex] = useState(null); // Index of the item being edited
  const [inputValue, setInputValue] = useState(""); // For editing price and quantity
  const [editField, setEditField] = useState(null); // Field being edited (price, quantity, etc.)
  const [showDropdown, setShowDropdown] = useState(false);
  const [temperatureValues, setTemperatureValues] = useState({});
  const [deliveryTimeValues, setDeliveryTimeValues] = useState({});
  const invoiceRef = useRef();

  useEffect(() => {
    setEditableInvoice(invoice); // Update when invoice prop changes
  }, [invoice]);

  const handleStatusChange = (field, value) => {
    setEditableInvoice((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateTotalPrice = () => {
    const totalPrice = editableInvoice.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
    setEditableInvoice((prev) => ({
      ...prev,
      totalPrice,
    }));
  };

  const handleSave = async () => {
    setShowDropdown(true);
    const invoiceDocRef = doc(db, "invoices", editableInvoice.id);
    try {
      await updateDoc(invoiceDocRef, editableInvoice);
      alert("Invoice updated successfully!");
      handleClose(); // Close the modal after saving
    } catch (err) {
      console.error("Error updating invoice: ", err);
    }
  };

  const handleSendInvoice = () => {
    setShowDropdown(true);
    setTimeout(async () => {
      const element = document.getElementById("invoice-pdf-template");
      if (!element) return;

      // Show temporarily to compute layout
      element.style.display = 'block';

      const options = {
        margin: [0.3, 0.3],
        filename: `Invoice_${editableInvoice.id || "Report"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          windowWidth: 800
        },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };

      try {
        await html2pdf().from(element).set(options).save();
      } catch (err) {
        console.error("PDF download failed:", err);
      } finally {
        // Hide again
        element.style.display = 'none';
      }
    }, 400);
  };

  const handleEditField = (field, index, value) => {
    const newItems = [...editableInvoice.items];
    newItems[index][field] = value;
    setEditableInvoice((prev) => ({
      ...prev,
      items: newItems,
    }));
    updateTotalPrice(); // Recalculate total
  };

  const handleBlur = () => {
    if (editingIndex !== null) {
      handleEditField(editField, editingIndex, inputValue);
      setEditingIndex(null); // Hide input field
      setEditField(null);
    }
  };
  console.log(invoice, "oppo1wpoqwpoqwpoqw")
  return (
    <Dialog open={isModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogContent>
        <div
          ref={invoiceRef}
          style={{ paddingLeft: "50px", paddingRight: "50px" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <DialogTitle style={{ fontSize: 40, marginLeft: -25 }}>
              Invoice
            </DialogTitle>
            <img
              src={LOGO}
              alt="Company Logo"
              style={{ width: "340px", marginRight: "40px" }}
            />
          </div>

          {/* Customer and Invoice Details */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
              marginTop: 20,
            }}
          >
            <div style={{ width: "45%" }}>
              <strong>Bill From:</strong> <br></br>
              <strong>Arya Bhavan - Central Kitchen</strong> <br></br>
              22,22A Ealing Rd, Wembley, HA0 4TL , United Kingdom
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div style={{ width: "45%" }}>
              <strong>Bill To:</strong> {editableInvoice.address}
            </div>
            <div style={{ width: "45%" }}>
              <strong>Invoice date:</strong>{" "}
              {/* {new Date().toISOString().split("T")[0]} */}
              {new Date(invoice.createdAt).toLocaleDateString('en-CA')}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div style={{ width: "45%" }}>
              <strong>Name:</strong> {editableInvoice.name}
            </div>
            <div style={{ width: "45%" }}>
              <strong>Restaurant Name:</strong> {editableInvoice.restaurantName}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div style={{ width: "45%" }}>
              <strong>Email:</strong> {editableInvoice.email}
            </div>
            <div style={{ width: "45%", marginBottom: 25 }}>
              <strong>Phone:</strong> {editableInvoice.phone}
            </div>
          </div>

          {/* Items Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Price (£/unit)</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Units</TableCell>
                  <TableCell>Total (£)</TableCell>
                  <TableCell>Temperature</TableCell>
                  <TableCell>Delivery Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editableInvoice.items.map((item, index) => (
                  <TableRow key={index} sx={{ height: '10px' }}>
                    {/* Editable Title */}
                    <TableCell sx={{ py: 0.5 }}>
                      {editingIndex === index && editField === "title" ? (
                        <TextField
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleBlur}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <>
                          {item.title}
                          <IconButton
                            size="small"
                            className="edit-icon"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditField("title");
                              setInputValue(item.title);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>



                    {/* Editable Price */}
                    <TableCell sx={{ py: 0.5 }}>
                      {editingIndex === index && editField === "price" ? (
                        <TextField
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleBlur}
                          type="number"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <>
                          £{item.price}
                          <IconButton
                            size="small"
                            className="edit-icon"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditField("price");
                              setInputValue(item.price);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>

                    {/* Editable Quantity */}
                    <TableCell sx={{ py: 0.5 }}>
                      {editingIndex === index && editField === "quantity" ? (
                        <TextField
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleBlur}
                          type="number"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <>
                          {item.quantity}
                          <IconButton
                            size="small"
                            className="edit-icon"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditField("quantity");
                              setInputValue(item.quantity);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>

                    {/* Editable Units */}
                    <TableCell sx={{ py: 0.5 }}>
                      {editingIndex === index && editField === "units" ? (
                        <TextField
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleBlur}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <>
                          {item.units}
                          <IconButton
                            size="small"
                            className="edit-icon"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditField("units");
                              setInputValue(item.units);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>

                    {/* Item Total Price */}
                    <TableCell sx={{ py: 0.5 }}>£{(item.price * item.quantity).toFixed(2)}</TableCell>

                    {/* Temperature - empty input for manual entry */}
                    <TableCell sx={{ py: 0.5 }}>
                      <TextField
                        size="small"
                        variant="outlined"
                        placeholder=""
                        value={temperatureValues[index] || ""}
                        onChange={(e) =>
                          setTemperatureValues((prev) => ({
                            ...prev,
                            [index]: e.target.value,
                          }))
                        }
                        sx={{ width: 100 }}
                        inputProps={{ style: { padding: '4px 8px' } }}
                      />
                    </TableCell>

                    {/* Delivery Time - empty input for manual entry */}
                    <TableCell sx={{ py: 0.5 }}>
                      <TextField
                        size="small"
                        variant="outlined"
                        placeholder=""
                        value={deliveryTimeValues[index] || ""}
                        onChange={(e) =>
                          setDeliveryTimeValues((prev) => ({
                            ...prev,
                            [index]: e.target.value,
                          }))
                        }
                        sx={{ width: 100 }}
                        inputProps={{ style: { padding: '4px 8px' } }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Order and Payment Status Dropdowns */}
          {showDropdown ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "16px",
              }}
            >
              <div style={{ width: "45%" }}>
                <strong>Order Status:</strong> {editableInvoice.orderStatus}
              </div>
              <div style={{ width: "45%" }}>
                <strong>Payment Status:</strong> {editableInvoice.paymentStatus}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "16px",
                width: "100%",
              }}
            >
              <FormControl fullWidth>
                <InputLabel id="order-status-label">Order Status</InputLabel>
                <Select
                  labelId="order-status-label"
                  value={editableInvoice.orderStatus}
                  onChange={(e) =>
                    handleStatusChange("orderStatus", e.target.value)
                  }
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="payment-status-label">
                  Payment Status
                </InputLabel>
                <Select
                  labelId="payment-status-label"
                  value={editableInvoice.paymentStatus}
                  onChange={(e) =>
                    handleStatusChange("paymentStatus", e.target.value)
                  }
                >
                  <MenuItem value="Unpaid">Unpaid</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </div>
          )}

          {/* Total Items */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "16px",
              fontWeight: "bold",
              borderTop: "2px solid #000",
              paddingTop: "8px",
            }}
          >
            <div>Total Items:</div>
            <div>£{editableInvoice.totalPrice.toFixed(2)}</div>
          </div>
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleSave}>Save</Button>
        <Button onClick={handleSendInvoice}>Send Invoice</Button>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>

      {/* Hidden PDF Template for Invoice */}
      <div style={{ display: 'none' }}>
        <div id="invoice-pdf-template" style={{ width: '750px', padding: '40px', backgroundColor: '#fff', fontFamily: 'sans-serif' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '30px' }}>
            <h1 style={{ fontSize: '40px', margin: 0 }}>Invoice</h1>
            <img src={LOGO} alt="Logo" style={{ width: "240px" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
            <div style={{ width: "45%" }}>
              <strong>Bill From:</strong> <br />
              <strong>Arya Bhavan - Central Kitchen</strong> <br />
              22,22A Ealing Rd, Wembley, HA0 4TL, UK
            </div>
            <div style={{ width: "45%", textAlign: 'right' }}>
              <strong>Invoice Date:</strong> {new Date(invoice.createdAt).toLocaleDateString('en-CA')} <br />
              <strong>Invoice ID:</strong> {editableInvoice.id}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
            <div style={{ width: "45%" }}>
              <strong>Bill To:</strong> <br />
              {editableInvoice.restaurantName} <br />
              {editableInvoice.address}
            </div>
            <div style={{ width: "45%", textAlign: 'right' }}>
              <strong>Contact:</strong> <br />
              {editableInvoice.name} <br />
              {editableInvoice.phone} <br />
              {editableInvoice.email}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                <th style={{ padding: '10px 5px' }}>Item</th>
                <th style={{ padding: '10px 5px', textAlign: 'right' }}>Price</th>
                <th style={{ padding: '10px 5px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '10px 5px' }}>Units</th>
                <th style={{ padding: '10px 5px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '10px 5px' }}>Temp</th>
                <th style={{ padding: '10px 5px' }}>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {editableInvoice.items.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 5px' }}>{item.title}</td>
                  <td style={{ padding: '10px 5px', textAlign: 'right' }}>£{item.price.toFixed(2)}</td>
                  <td style={{ padding: '10px 5px', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '10px 5px' }}>{item.units}</td>
                  <td style={{ padding: '10px 5px', textAlign: 'right' }}>£{(item.price * item.quantity).toFixed(2)}</td>
                  <td style={{ padding: '10px 5px' }}>{temperatureValues[index] || ""}</td>
                  <td style={{ padding: '10px 5px' }}>{deliveryTimeValues[index] || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", borderTop: "2px solid #333", paddingTop: "15px" }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Total Amount</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>£{editableInvoice.totalPrice.toFixed(2)}</div>
          </div>

          <div style={{ marginTop: '20px', fontSize: '13px' }}>
            <div><strong>Order Status:</strong> {editableInvoice.orderStatus}</div>
            <div><strong>Payment Status:</strong> {editableInvoice.paymentStatus}</div>
          </div>

          <div style={{ marginTop: '50px', borderTop: '1px solid #eee', paddingTop: '10px', textAlign: 'center', color: '#999', fontSize: '11px' }}>
            Thank you for your business!
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default InvoiceModal;
