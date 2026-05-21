import React, { useContext } from 'react';
import { AuthContext } from '../auth-context';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import { useMediaQuery } from '@mui/material';

const Header = ({title}) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate(); // Initialize useNavigate hook
  const isMobile = useMediaQuery("(max-width:600px)");

  const handleLogout = () => {
    logout(); // Call logout from context
    navigate('/'); // Redirect to the login screen
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "20px",
        justifyContent: "space-between", // Ensures space between items
        width:isMobile ? '100%' :'100%',
        marginLeft:-8,
        marginTop:-7,
        backgroundColor: "#f8f4e1", 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 1000,
      }}
    >
      <div style={{ textAlign: 'center', width: '100%' }}>
        <h1 style={{ margin: 0, color: "red", fontWeight: "bold" }}>
          {title}
        </h1>
        <p style={{ margin: 0, color: "black" }}>Central Processing Unit</p>
      </div>
      <button
        onClick={handleLogout}
        style={{
          padding: "10px 20px",
          backgroundColor: "red",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
          marginLeft: "auto" // Pushes the button to the right
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Header;
