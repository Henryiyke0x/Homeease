import express from "express";
import cors from "cors";
import helmet from "helmet";
import publicRoutes from "./routes/publicRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import adminServiceRoutes from "./routes/adminServiceRoutes.js";
import adminBookingRoutes from "./routes/adminBookingRoutes.js";
import professionalJobRoutes from "./routes/professionalJobRoutes.js";
import professionalApplicationRoutes from "./routes/professionalApplicationRoutes.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(publicRoutes);
app.use(authRoutes);
app.use(customerRoutes);
app.use(adminServiceRoutes);
app.use(adminBookingRoutes);
app.use(professionalJobRoutes);
app.use(professionalApplicationRoutes);

export default app;
