import express from "express";
const routers = express();
import userRouter from "./user"
import authRouter from "./auth"
import similarityRouter from "./similarity-report"

routers.use("/users", userRouter);
routers.use("/auth", authRouter);
routers.use("/similarity-reports", similarityRouter);
routers.get("/", (req, res) => {
  res.send("TopDup!");
});

export default routers;
