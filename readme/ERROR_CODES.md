# Error Codes Reference

This document lists all error codes used in the application and their meanings.

## Authentication Errors

### AUTH-001
**Message:** Error: try again later  
**Meaning:** Cannot connect to the API server during login. The backend may be down or unreachable.  
**User Action:** Wait a moment and try again. If the problem persists, contact support.

### AUTH-002
**Message:** Invalid credentials  
**Meaning:** The username or password is incorrect.  
**User Action:** Check your credentials and try again.

### AUTH-003
**Message:** Login failed  
**Meaning:** General login failure. Could be due to server error or invalid credentials.  
**User Action:** Try again. If the problem persists, contact support.

### AUTH-004
**Message:** Registration failed  
**Meaning:** Unable to create a new account. Could be due to duplicate username/email or server error.  
**User Action:** Try again with different credentials. If the problem persists, contact support.

### AUTH-005
**Message:** PIN verification failed  
**Meaning:** The PIN entered is incorrect or PIN verification service is unavailable.  
**User Action:** Check your PIN and try again.

### AUTH-006
**Message:** Password format invalid  
**Meaning:** Password does not meet complexity requirements. The error message will specify what is missing (uppercase, lowercase, number, or special character).  
**User Action:** Update your password to include the missing requirements as specified in the error message.

## Network Errors

### NET-001
**Message:** Error: try again later  
**Meaning:** Network connection error. Cannot reach the server.  
**User Action:** Check your internet connection and try again.

### NET-002
**Message:** Network error: Cannot connect to server  
**Meaning:** Failed to establish connection to the API server.  
**User Action:** Wait a moment and try again. If the problem persists, contact support.

## User Management Errors

### USER-001
**Message:** Failed to create user  
**Meaning:** Unable to create a new user. Could be due to duplicate username/email or validation error.  
**User Action:** Check the form fields and try again.

### USER-002
**Message:** Failed to update user  
**Meaning:** Unable to update user information.  
**User Action:** Check the form fields and try again.

### USER-003
**Message:** Failed to load users  
**Meaning:** Unable to retrieve the list of users.  
**User Action:** Refresh the page and try again.

### USER-004
**Message:** Password must be at least 6 characters  
**Meaning:** The password provided is too short.  
**User Action:** Enter a password with at least 6 characters.

## Sales Errors

### SALE-001
**Message:** Failed to record sale  
**Meaning:** Unable to save the sale to the database.  
**User Action:** Try again. If the problem persists, contact support.

### SALE-002
**Message:** Insufficient stock  
**Meaning:** Not enough inventory to complete the sale.  
**User Action:** Check available stock and adjust the quantity.

## Data Loading Errors

### DATA-001
**Message:** Error: try again later  
**Meaning:** Failed to load application data. The server may be temporarily unavailable.  
**User Action:** Refresh the page and try again.

## General Errors

### GEN-001
**Message:** An error occurred  
**Meaning:** An unexpected error happened.  
**User Action:** Try again. If the problem persists, contact support.

---

**Note:** For technical support, provide the error code when reporting issues.

