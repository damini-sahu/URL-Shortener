import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from "../config/constants.js";
import { refreshTokens, verifyJWToken } from "../services/auth.services.js";

export const verifyAuthentication =async (req, res, next) => {
const accessToken = req.cookies.access_token;
const refreshToken = req.cookies.refresh_token;

req.user = null;

if (!accessToken && !refreshToken) {
return next();
}

if(accessToken) {
    const decodeToken = verifyJWToken(accessToken)
    req.user= decodeToken;
    return next()
}
if(refreshToken) {
try {
    const result = await refreshTokens(refreshToken)
    if(!result) {
      return next()
    }

    const {newAccessToken, newRefreshToken, user} = result;
    req.user = user

    const baseConfig = {httpOnly: true, secure: true};
    
    res.cookie("access_token", newAccessToken, {
      ...baseConfig,
      maxAge: ACCESS_TOKEN_EXPIRY,
    })
    
    res.cookie("refresh_token", newRefreshToken, {
      ...baseConfig,
      maxAge: REFRESH_TOKEN_EXPIRY,
    })

return next()

} catch (error) {
    console.log(error.message); 
}
}
return next()
}