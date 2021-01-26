import express from "express";
import authController from "../controllers/auth";
const router = express.Router();

router.post("/get-token",
    // middlewares
    // authController.getToken
    authController.loginNormal
);

router.get(
    "/get-token/fb",
    authController.loginFaceBook
)

router.get(
    "/get-token/gg",
    authController.loginGoogle
)


router.post(
    "auth/user",
    authController.register
)

router.post(
    "auth/reset-password",
)



export default router