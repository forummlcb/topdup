import express from "express";
const routers = express();
import userRouter from "./user"
import authRouter from "./auth"
import similarityRouter from "./similarity-report"

routers.use("/api/v1/users", userRouter);
routers.use("/api/v1/auth", authRouter);
routers.use("/api/v1/similarity-reports", similarityRouter);
routers.get("/", (req, res) => {
  res.send("TopDup!");
});

export default routers;
