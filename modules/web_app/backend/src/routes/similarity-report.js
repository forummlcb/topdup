import express from "express";
import similarityReportCtrl from "../controllers/similarity-report";
const router = express.Router();

router.get("/",
    // middlewares
    similarityReportCtrl.getSimilarityRecords
);

export default router