const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const port = 5000;
const routers = require('./routes')

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use("/", routers);
