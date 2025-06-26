# OneBreath React Application

## Overview

OneBreath is a full-stack web platform designed for managing and tracking samples (e.g., medical, laboratory) throughout their lifecycle. It supports sample registration via QR codes or manual input and provides a dashboard to monitor sample statuses such as 'In Process', 'Ready for Pickup', and 'Picked up. Ready for Analysis'. The application features a React-based frontend and a Python (Flask) backend.

## Key Features

*   **User Authentication:** Secure login, protected routes, and session management (utilizing Firebase).
*   **Role-Based Access Control:** Separate functionalities and views for standard users and administrators (e.g., Admin Dashboard).
*   **Sample Registration:**
    *   QR Code Scanning for quick sample ID input.
    *   Manual Entry form for sample details.
*   **Sample Tracking Dashboard:** Real-time (or near real-time) view of samples categorized by status:
    *   In Process
    *   Ready for Pickup
    *   Picked up. Ready for Analysis
*   **Update Sample Information:** Ability to edit details and status of existing samples.
*   **Completed Samples View:** A dedicated section to review samples that have completed the tracking lifecycle.
*   **Data Viewing & Management:** Interface for browsing and managing broader datasets related to samples.
*   **Admin Dashboard:** Specialized interface for administrative tasks, potentially including user management, system health monitoring, and log viewing.
*   **Real-time Updates:** WebSocket integration for live updates on dashboards and sample statuses.
*   **API Backend:** Robust API for handling sample data, authentication, and other application logic.

## Tech Stack

**Frontend:**
*   React (v18)
*   TypeScript
*   Vite (Build tool & Dev Server)
*   React Router DOM (v6 for client-side routing)
*   Tailwind CSS (Utility-first CSS framework)
*   HTML5 QR Code (Library for QR code scanning)
*   React Hot Toast (Notifications)
*   Axios (HTTP client)
*   Socket.IO Client

**Backend:**
*   Python (v3.x)
*   Flask (Web framework)
*   Flask-SocketIO (WebSocket integration)
*   Eventlet (Concurrent networking library for Gunicorn)
*   Gunicorn (WSGI HTTP Server)
*   Flask-CORS
*   Flask-Mail
*   Flask-APScheduler (Task scheduling)

**Databases & External Services:**
*   MongoDB (Primary database for sample data)
*   Firebase (Authentication, Firebase Admin SDK for backend operations)
*   Google Cloud Storage (GCS for file/data storage)
*   OpenAI (Integration for AI-powered features, if any)

**Styling & Linting:**
*   CSS / PostCSS
*   ESLint (Code linting for TypeScript/JavaScript)

## Project Structure

### Frontend (`src/`)

*   `main.tsx`: Application entry point.
*   `App.tsx`: Root React component, sets up routing and global contexts.
*   `components/`: Reusable UI components, organized by feature (e.g., `auth/`, `dashboard/`, `common/`) and layout.
*   `pages/`: Top-level React components for each application route/view.
*   `services/`: Modules for API interactions and other external services (e.g., `api.ts`, `firebase.ts`).
*   `context/`: React Context API implementations for global state management (e.g., `AuthContext.tsx`).
*   `hooks/`: Custom React hooks for reusable component logic.
*   `utils/`: General utility functions.
*   `types/`: TypeScript type definitions for the project.
*   `assets/`: Static assets like fonts and images.
*   `index.css`: Global stylesheets.

### Backend (`src/server/`)

*   `main.py`: Flask application entry point; initializes the Flask app, extensions (SocketIO, CORS, Mail, Scheduler), database connections (MongoDB), and other services (Firebase Admin, GCS, OpenAI). Registers API blueprints.
*   `wsgi.py`: WSGI entry point for Gunicorn.
*   `config.py`: Contains configuration classes for the Flask application (e.g., database URIs, mail settings, API keys).
*   `routes/`: Defines API blueprints and endpoints (e.g., `api.py`, `admin.py`).
*   `utils/`: Backend-specific utility functions and helper modules.
*   `tasks/`: Modules for scheduled or background tasks managed by APScheduler.
*   `scripts/`: Utility scripts for backend operations.
*   The Firebase Admin SDK JSON key file needs to be correctly configured and accessible to the backend for Firebase Admin operations.

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd onebreath-react
    ```

2.  **Frontend Setup:**
    *   Navigate to the project root directory.
    *   Install Node.js dependencies:
        ```bash
        npm install
        ```

3.  **Backend Setup:**
    *   Ensure Python (v3.x) and pip are installed.
    *   Navigate to the project root directory (where `requirements.txt` is located).
    *   Create and activate a Python virtual environment:
        ```bash
        python -m venv venv
        # On macOS/Linux
        source venv/bin/activate
        # On Windows
        # venv\Scripts\activate
        ```
    *   Install Python dependencies:
        ```bash
        pip install -r requirements.txt
        ```

4.  **Configuration:**
    *   **Frontend:** The frontend application expects certain Vite environment variables (prefixed with `VITE_`) to be available during the build process or when running the dev server. These are typically for connecting to the backend API and Firebase services.
    *   **Backend:** The Python backend requires various configurations for services like Flask, Mail, Twilio (if used), MongoDB, Google Cloud Storage, OpenAI, and the Firebase Admin SDK. These are typically managed via environment variables loaded by `src/server/config.py`. Ensure these configurations are appropriately set for your environment. The Firebase Admin SDK requires a service account JSON key file; ensure the backend can access and use this file.

## Running the Application

1.  **Backend Server:**
    *   Ensure all necessary backend configurations are in place.
    *   Activate the Python virtual environment if not already active:
        ```bash
        source venv/bin/activate 
        ```
    *   Start the Gunicorn server (from the project root):
        ```bash
        sh run.sh
        ```
        Alternatively, if `run.sh` is not used or for direct Gunicorn invocation (ensure `wsgi:app` is correctly pointing to your Flask app instance in `src/server/wsgi.py` or `src/server/main.py`):
        ```bash
        gunicorn --worker-class eventlet -w 1 wsgi:app 
        ```
        The backend server will typically run on `http://localhost:5000` (or the port specified in its configuration).

2.  **Frontend Development Server:**
    *   Open a new terminal in the project root directory.
    *   Ensure the frontend is configured to connect to the running backend (typically via `VITE_API_URL`).
    *   Start the Vite development server:
        ```bash
        npm run dev
        ```
    *   The frontend application will usually be accessible at `http://localhost:5173` (Vite will display the actual URL).

## Available Scripts (Frontend)

In the project root directory, you can run several npm scripts:

*   `npm run dev`: Starts the Vite development server for the frontend.
*   `npm run build`: Builds the production-ready frontend application (compiles TypeScript and bundles assets).
*   `npm run lint`: Lints the TypeScript and TSX files using ESLint.
*   `npm run preview`: Serves the production build locally for preview.

## Deployment

*   **Netlify (`netlify.toml`):** Configuration for deploying the frontend to Netlify.
*   **Render (`render.yaml`):** Configuration for deploying services (likely the backend) to Render.
*   The `main.yml` file might be related to GitHub Actions for CI/CD.

This README provides a comprehensive guide to understanding, setting up, and running the OneBreath React application.
