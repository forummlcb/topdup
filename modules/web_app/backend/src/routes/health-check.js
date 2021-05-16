import express from "express";
import hcCtrl from "../controllers/health-check";
const router = express.Router();

router.get("/",
    // middlewares
    hcCtrl.getInfoHC);


export default router