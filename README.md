# JS Glow - Comprehensive Sales & Management SaaS

JS Glow is a powerful, role-based SaaS application built with Next.js and Firebase, designed to streamline sales, inventory, and expense management for your business. It provides different interfaces and functionalities based on user roles, ensuring that each team member has access to exactly what they need.

## Key Features

### 1. Role-Based Access Control (RBAC)
The application supports five distinct user roles, each with a tailored experience:
-   **Admin:** Full control over the application, including all financial data, user management, and core settings.
-   **Manager:** Can oversee sales, inventory, expenses, and manage daily plans for salesmen and tasks for workers.
-   **Salesman:** Can enter daily sales and view their assigned daily plans.
-   **Cashier:** Can manage sales entries and expenses.
-   **Worker:** Can view their assigned daily tasks and manage inventory.

### 2. Dynamic, Role-Specific Dashboards
-   **Admin/Manager/Cashier View:** A comprehensive overview of key business metrics, including total revenue, units sold, best-selling products, and recent sales activity with a monthly sales chart.
-   **Salesman View:** A focused dashboard displaying the salesman's assigned location and special items for the day, ensuring they have clear instructions.
-   **Worker View:** A simple, task-oriented dashboard showing the specific task assigned for the day (e.g., "Pack 50 boxes of soap") with a direct link to the inventory page.

### 3. Core Business Operations
-   **Sales Entry:** An intuitive form for salesmen and other authorized roles to record daily sales, including customer details (name, phone, address) and a detailed list of products sold.
-   **Sales Records:** A dedicated page for Admins and Managers to view a complete history of all sales transactions with collapsible rows to see product details for each sale.
-   **Inventory Management:** A full CRUD (Create, Read, Update, Delete) interface for managing the product inventory.
-   **Expense Tracking:** A system for recording, viewing, and managing all business-related expenses.

### 4. Management & Planning Tools
-   **Salesman Plans:** A feature for Admins and Managers to set daily route plans (today's and tomorrow's locations) for each salesman.
-   **Worker Tasks:** A tool for Admins and Managers to assign specific daily tasks to workers, improving warehouse efficiency.

### 5. AI-Powered Anomaly Detection
-   Utilizes a Genkit AI flow to analyze sales data submitted by salesmen.
-   It helps detect potential discrepancies or anomalies based on factors like location and time, providing an extra layer of oversight.

### 6. Advanced Settings & Customization
-   **Appearance:** Users can switch between light and dark themes.
-   **Branding & Localization:** Admins can customize the application name, logo, favicon, and set the default currency for the entire application.
-   **Security:** Admins have exclusive access to a "Sign Up Page Visibility" toggle. This allows them to enable or disable the public sign-up page, preventing unauthorized user registration.

### 7. Authentication
-   Secure user authentication (Login/Sign Up) is handled via Firebase Authentication.
-   The sign-up page can be dynamically hidden based on the Admin's settings for enhanced security.
