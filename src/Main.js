import express from "express";
import DataBase from "./DB/connection.js";
import router_handler from "./Utils/router_handler.utils.js";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

dotenv.config();

// to allow who can call me using cors
const whitelist = [
  process.env.FRONT_END_ORIGIN,
  undefined,
  "*" /* to tell the cors to accept postman requests ( need to delete it after the test ) */,
];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

const general_rate_limit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  limit: 100,
  message: " Too many requests, slow down.",
  legacyHeaders: false,
  standardHeaders: true,
});

const bootstrap = () => {
  const app = express();

  app.use(cors(corsOptions));
  app.use(
    helmet({ xContentTypeOptions: false, crossOriginOpenerPolicy: true }) 
  );
  app.use(general_rate_limit);

  // database
  DataBase();

  // test for production
  app.get("/test", async (req, res, next) => {
    if (req.params.value == "prod") {
      return next("router");
    }
    res
      .status(200)
      .json({ message: "hello from prod test production ", mms: req.xhr });
  });

  //all the routers
  router_handler(app, express);

  const server = app.listen(process.env.PORT || 3000, (error) => {
    // console.log( "server is running on " , process.env.PORT     );

    if (error) {
      throw error; // e.g. EADDRINUSE
    }
    console.log(`Listening on =========> ${JSON.stringify(server.address())}`);
  });
};

export default bootstrap;
