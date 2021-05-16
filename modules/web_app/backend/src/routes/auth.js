import express from "express"
import authController from "../controllers/auth"
import { requiredField } from "./middlewares"
const router = express.Router()

router.get(
    "/verification/verify-account/:userId/:secret_code",
    authController.confirmEmail
)

router.post("/get-token",
    // middlewares
    (req, res, next) => requiredField(req, res, ["email", "password"], [], [], next),
    authController.loginNormal
)

router.post(
    "/get-token/fb",
    (req, res, next) => {
        requiredField(req, res, ["fbToken", "fbId"], [], [], next)
    },
    authController.loginByFaceBook
)

router.post(
    "/get-token/gg",
    (req, res, next) => {
        requiredField(req, res, ["ggToken", "ggId"], [], [], next)
    },
    authController.loginByGoogle
)


router.post(
    "/user",
    (req, res, next) => {
        requiredField(req, res, ["email", "password"], [], [], next)
    },
    authController.register
)

router.post(
    "/reset-password",
    (req, res, next) => {
        requiredField(req, res, ["password", "email", "secret_code"], [], [], next)
    },
    authController.restPassword
)
router.get(
    "/secret_code",
    (req, res, next) => {
        requiredField(req, res, [], [], ["email"], next)
    },
    authController.genSecretCode
)

export default router