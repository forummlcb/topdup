import express from "express"
import similarityReportCtrl from "../controllers/similarity-report"
const router = express.Router()

router.get("/",
    // middlewares
    similarityReportCtrl.getSimilarityRecords
)

router.post("/:id/vote",
    // middlewares
    similarityReportCtrl.applyVote
)

export default router