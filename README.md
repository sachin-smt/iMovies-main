# iMovies — MERN Movie Booking Application

## 1. Project Overview

iMovies is a movie ticket booking web application built using the MERN stack. It allows users to browse movies, view showtimes, select seats, make payments using Razorpay test mode, manage bookings, and save favorite movies.

## 2. Technology Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas, Mongoose
- **Authentication:** JSON Web Tokens (JWT)
- **Password Hashing:** bcrypt
- **Payment Gateway:** Razorpay

## 3. Project Structure

```text
imovies/
├── client/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── index.html
├── server/
│   ├── middleware/
│   ├── models/
│   ├── package.json
│   └── server.js
└── README.md
```

## 4. Prerequisites

Install the following before running the project:

- Node.js and npm
- MongoDB Atlas account or a compatible MongoDB instance
- Razorpay test API credentials

## 5. Installation

### Backend Setup

Open a terminal and run:

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory and configure these variables:

```dotenv
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
```

Replace the example values with your own credentials. Never commit your actual `.env` file.

### Frontend Setup

Open another terminal and run:

```bash
cd client
npm install
```

## 6. Running the Application

### Start the Backend

From the `server` directory, use the start command defined in `server/package.json`. For example, if the project defines a `start` script:

```bash
npm start
```

### Start the Frontend

From the `client` directory:

```bash
npm run dev
```

Open the local URL displayed in the terminal by Vite.

## 7. Main Features

- User registration and login
- Movie browsing and showtime selection
- Seat selection and ticket booking
- Razorpay payment integration in test mode
- Booking history and cancellation
- Favorites management
- Admin-protected movie management

## 8. Security Considerations

- Keep `.env` files and API secrets private.
- Use Razorpay test credentials during development.
- Protect API routes with authentication middleware.
- Restrict administrative operations to authorized administrators.
- Never commit passwords, tokens, or API secrets to Git.

## 9. Testing and Project Status

The main application workflows have been tested locally, including authentication, movie browsing, booking, payment, cancellation, and favorites.

Deployment is outside the scope of the current project work.
"# iMovies-main" 
