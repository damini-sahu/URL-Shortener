import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import flash from "connect-flash";
import  requestIp from "request-ip"

import { authRoute } from "./routes/auth.routes.js";
import { shortenerRoutes } from "./routes/shortner.routes.js";
import { verifyAuthentication } from "./middlewares/verify-auth-middleware.js";

const app = express();

const PORT = process.env.PORT || 3001;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.use(cookieParser())            

app.use(session({secret:"my-secret", resave: true, saveUninitialized:false}))      
app.use(flash())

app.use(requestIp.mw())

app.use(verifyAuthentication);
app.use((req, res, next) => {
 res.locals.user = req.user;             
return next();                        
})

app.use(authRoute)
app.use(shortenerRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});