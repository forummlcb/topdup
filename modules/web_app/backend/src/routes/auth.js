import express from "express";
import authController from "../controllers/auth";
import {requiredField} from "./middlewares"
const router = express.Router();


router.get(
    "/verification/verify-account/:userId/:code",
    authController.confirmEmail
)

router.post("/get-token",
    // middlewares
    (req, res, next) => {
        requiredField(req, res, ["email","password"], [], [], next)
    },
    authController.loginNormal
);

router.post(
    "/get-token/fb",
    (req, res, next) => {
        requiredField(req, res, ["fbToken","fbId"], [], [], next)
    },
    authController.loginFaceBook
)

router.post(
    "/get-token/gg",
    (req, res, next) => {
        requiredField(req, res, ["ggToken","ggId"], [], [], next)
    },
    authController.loginGoogle
)


router.post(
    "auth/user",
    (req, res, next) => {
        requiredField(req, res, ["email","password","firstName","lastName"], [], [], next)
    },
    authController.register
)

router.post(
    "auth/reset-password",
)

export default router