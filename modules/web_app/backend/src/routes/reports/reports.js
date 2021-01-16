import express from "express";
import ReportController from "../../controllers/reports/reports";
const ReportRouter = express.Router();

ReportRouter.get("/similiraty-reports",
    // middlewares
    ReportController.getSimilarity
);

export default ReportRouter