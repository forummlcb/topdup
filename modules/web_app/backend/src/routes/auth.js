import express from "express";
import authController from "../controllers/auth";
const router = express.Router();

router.get("/token",
    // middlewares
    authController.getToken
);

export default router