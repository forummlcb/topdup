import express from "express";
const routers = express();
import User from "./users/index"
import Reports from "./reports/reports"

routers.use("/api/v1/", User);
routers.use("/api/v1/reports/", Reports);
routers.get("/", (req, res) => {
  res.send("TopDup!");
});
export default routers;
