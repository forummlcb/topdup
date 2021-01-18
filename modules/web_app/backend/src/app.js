import express from "express";
import routes from "./routes";
import logger from "morgan";
const cors = require("cors");
import { Server } from 'http';
import bodyParser from "body-parser";
// import hpp from 'hpp'
// import xXssProtection from "x-xss-protection"
require('dotenv').config();
export const app = express();
const port = 5000;
app.use(bodyParser.json());
app.use(cors());
export const server = Server(app);


// var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
// app.use(hpp())
// app.use(xXssProtection());
// app.use(logger(':method :status :url :date[iso] :response-time', { stream: accessLogStream }));


app.use("/", routes);
/* ----------  Errors  ---------- */


// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.json({
    status: 404,
    code: 502,
    message: 'API Not Found'
  });
  next(res);
});

app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.json({
    code: 500,
    error: err
  });
});

/**
 * development error handler
 * will print stacktrace
 */
if (app.get('env') === 'development') {
  app.use((err, req, res) => {
    res.status(err.status || 500);
    res.json({
      code: 500,
      message: 'Error. Try again later',
      error: err
    });
  });
}

/**
 * production error handler
 * no stacktraces leaked to user
 */
app.use((err, req, res) => {
  res.status(err.status || 500);
  res.json({
    code: 500,
    message: 'Error. Try again later',
    error: err
  });
});

process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.log('unhandledRejection', error);
});
server.listen(port);


export default app;
