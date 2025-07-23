import {
  authenticateUser, clearResetPasswordToken, clearUserSession, clearVerifyEmailToken, comparePassword,
  createResetPasswordLink,
  createUsers, createUserWithOauth, findUserByEmail, findUserById, findVerificationEmailToken,
  getAllShortLinks, getResetPasswordToken, getUserByEmail, getUserWithOauthId, hashPassword, linkUserWithOauth, sendVerifyEmailLink, updateUserByName,
  updateUserPassword, verifyUserEmailAndUpdate} from "../services/auth.services.js";
import { forgotPasswordSchema, loginUserSchema, registerUserSchema, setPasswordSchema, verifyEmailSchema,
 verifyPasswordSchema, verifyResetPasswordSchema, verifyUserSchema } from "../validators/auth.validator.js";
import { getHtmlFromMjmlTemplate } from "../lib/get-html-from-mjml-Template.js";
import { sendEmail } from "../lib/send-email.js";
import { decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import { google } from "../lib/oauth/google.js";
import { OAUTH_EXCHANGE_EXPIRY } from "../config/constants.js";
import { github } from "../lib/oauth/github.js";


export const getRegisterPage = (req, res) => {
  if (req.user) return res.redirect("/")
  return res.render("auth/register", { errors: req.flash("errors") })                //! both are same
}

export const postRegisterPage = async (req, res) => {
  if (req.user) return res.redirect("/")

  const { data, error } = registerUserSchema.safeParse(req.body)

  if (error) {
    const errors = error.errors[0].message;
    req.flash("errors", errors)

    res.redirect("/register")
  }
  const { name, email, password } = data;

  const userExists = await getUserByEmail(email);
  console.log("User Exists: ", userExists);

  if (userExists) {
    req.flash("errors", "User already exists")
    return res.redirect("/register")
  }

  const hashedPassword = await hashPassword(password);

  const [user] = await createUsers({ name, email, password: hashedPassword });
  console.log(user);
 
  await authenticateUser({ req, res, user, name, email })
  await sendVerifyEmailLink({ email, userId: user.id })
  res.redirect("/")
}

export const getLoginPage = (req, res) => {
  if (req.user) return res.redirect("/")
  return res.render("auth/login", { errors: req.flash("errors") })
}

export const postLogin = async (req, res) => {
  if (req.user) return res.redirect("/")

  const { data, error } = loginUserSchema.safeParse(req.body)

  if (error) {
    const errors = error.errors[0].message;
    req.flash("errors", errors)

    res.redirect("/login")
  }
  const { email, password } = data;

  const user = await getUserByEmail(email);
  console.log("User: ", user);

  if (!user) {
    req.flash("errors", "Invalid email or password")
    return res.redirect("/login")
  }

  if (!user.password) {
    req.flash("errors", " We have created account using social login. Please login with your social account.")
    return res.redirect("/login")
  }

  const isPasswordValid = await comparePassword(password, user.password)

  if (!isPasswordValid) {
    req.flash("errors", "Invalid email or password")
    return res.redirect("/login")
  }

  await authenticateUser({ req, res, user })
  res.redirect("/")
}

export const getMe = (req, res) => {
  if (!req.user) return res.send("Not logged in")

  return res.send(`<h1> Hey ${req.user.name} - ${req.user.email} </h1>`)
}

export const logoutUser = async (req, res) => {

  await clearUserSession(req.user.sessionId)

  res.clearCookie("access_token")  //! cookie parser ka use kiya hai
  res.clearCookie("refresh_token")  //! cookie parser ka use kiya hai
  res.redirect("/login")
}

export const getProfilePage = async (req, res) => {
  if (!req.user) return res.send("Not Logged In")

  const user = await findUserById(req.user.id)

  if (!user) return res.redirect("/login")

  const userShortLinks = await getAllShortLinks(user.id)

  return res.render("auth/profile", {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isEmailValid: user.isEmailValid,
      hasPassword: Boolean(user.password),
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      links: userShortLinks
    }
  })
}

export const getVerifyEmailPage = async (req, res) => {
  if (!req.user) return res.redirect("/")

  const user = await findUserById(req.user.id)

  if (!user || user.isEmailValid) return res.redirect("/")

  res.render("auth/verify-email", {
    email: req.user.email,
  })
}

export const resendVerificationLink = async (req, res) => {
  if (!req.user) return res.redirect("/")
  const user = await findUserById(req.user.id)
  if (!user || user.isEmailValid) return res.redirect("/")

  await sendVerifyEmailLink({ email: req.user.email, userId: req.user.id })

  res.redirect("/verify-email")

}

export const verifyEmailToken = async (req, res) => {
  const { data, error } = verifyEmailSchema.safeParse(req.query)

  if (error) {
    return res.send("Verification link invalid or expired.")
  }

  const [token] = await findVerificationEmailToken(data)     
  console.log("verificationEmail token", token);
  if (!token) return res.send("Verification link invalid or expired.")

  await verifyUserEmailAndUpdate(token.email)

  clearVerifyEmailToken(token.email).catch(console.error);

  return res.redirect("/profile")
}

export const getEditProfilepPage = async (req, res) => {
  if (!req.user) return res.redirect("/")

  const user = await findUserById(req.user.id)
  if (!user) return res.status(404).send("User not found.")

  return res.render("auth/edit-profile", {
    name: user.name,
    avatarUrl: user.avatarUrl,
    errors: req.flash("errors")
  })
}

export const postEditProfile = async (req, res) => {
  if (!req.user) return res.redirect("/")

  const { data, error } = verifyUserSchema.safeParse(req.body)

  if (error) {
    const errorMessage = error.errors.map((err) => err.message)
    req.flash("errors", errorMessage)
    return res.redirect("/edit-profile")
  }

  const fileUrl = req.file ? `uploads/avatar/${req.file.filename}` : undefined;
  await updateUserByName({ userId: req.user.id, name: data.name, avatarUrl: fileUrl })

  return res.redirect("/profile")
}

export const getChangePasswordPage = async (req, res) => {
  if (!req.user) return res.redirect("/")

  return res.render("auth/change-password", {
    errors: req.flash("errors")
  })
}

export const postChangePassword = async (req, res) => {
  const { data, error } = verifyPasswordSchema.safeParse(req.body)

  if (error) {
    const errorMessage = error.errors.map((err) => err.message)
    req.flash("errors", errorMessage)
    return res.redirect("/change-password")
  }
  console.log("data: ", data);

  const { currentPassword, newPassword } = data;

  const user = await findUserById(req.user.id)
  if (!user) return res.status(404).send("User not found.")

  const isPasswordValid = comparePassword(currentPassword, user.password)
  if (!isPasswordValid) {
    req.flash("errors", " Current Password that you entered is invalid")
    return res.redirect("/change-password")
  }
  await updateUserPassword({ userId: req.user.id, newPassword })

  return res.redirect("/profile")

}

export const getResetPasswordPage = async (req, res) => {
  return res.render("auth/forgot-password", {
    formSubmitted: req.flash("formSubmitted")[0],
    errors: req.flash("errors")
  })
}

export const postForgotPassword = async (req, res) => {
  const { data, error } = forgotPasswordSchema.safeParse(req.body)

  if (error) {
    const errorMessages = error.errors.map((err) => err.message)
    req.flash("errors", errorMessages[0])
    return res.redirect("/reset-password")
  }

  const user = await findUserByEmail(data.email)

  if (user) {
    const resetPasswordLink = await createResetPasswordLink({userId: user.id})

    const html = await getHtmlFromMjmlTemplate("reset-password", {
      name: user.name,
      link: resetPasswordLink,
    })

sendEmail({
  to: user.email,
  subject: "Reset Your Password",
  html,
})
  }
  req.flash("formSubmitted", true)
  return res.redirect("/reset-password")
}

export const getResetPasswordTokenPage = async (req, res) => {
  const {token} = req.params;

  const passwordResetData = await getResetPasswordToken(token)
  if (!passwordResetData) return res.render("auth/wrong-reset-password-token")

return res.render("auth/reset-password", {
   formSubmitted: req.flash("formSubmitted")[0],
    errors: req.flash("errors"),
    token,
})
}

export const postResetPasswordToken = async (req, res) => {
  const {token} = req.params;

  const passwordResetData = await getResetPasswordToken(token)
  if (!passwordResetData) {
    req.flash("errors", "Password Token is not matching")
    return res.render("auth/wrong-reset-password-token")
  }

const {data, error} = verifyResetPasswordSchema.safeParse(req.body)

if (error) {
    const errorMessages = error.errors.map((err) => err.message)
    req.flash("errors", errorMessages[0])
    return res.redirect(`/reset-password/${token}`)
  }

  const {newPassword} = data;

  const user = await findUserById(passwordResetData.userId)

  await clearResetPasswordToken(user.id)

 await updateUserPassword({userId: user.id, newPassword})

 return res.redirect("/login")
}

export const getGoogleLoginPage = async (req, res) => {
  if (req.user) return res.redirect("/");

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid", 
    "profile", 
    "email",
  ]);

  const cookieConfig = {
    httpOnly: true,
    secure: true,
    maxAge: OAUTH_EXCHANGE_EXPIRY,
    sameSite: "lax", 
  };

  res.cookie("google_oauth_state", state, cookieConfig);
  res.cookie("google_code_verifier", codeVerifier, cookieConfig);

  res.redirect(url.toString());
};

export const getGoogleLoginCallback = async (req, res) => {
  // console.log("req.query:", req.query);

  const {code, state} = req.query;
  console.log(code, state);

  const {
    google_oauth_state: storedState,
    google_code_verifier: codeVerifier,
  } = req.cookies;

  if (
    !code ||
    !state ||
    !storedState ||
    !codeVerifier ||
    state !== storedState
  ) {
    req.flash(
      "errors",
      "Couldn't login with Google because of invalid login attempt. Please try again!"
    );
    return res.redirect("/login");
  }

  let tokens;
 try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch {
    req.flash(
      "errors",
      "Couldn't login with Google because of invalid login attempt. Please try again!"
    );
    return res.redirect("/login");
  }

  const claims = decodeIdToken(tokens.idToken());
  const { sub: googleUserId, name, email, picture } = claims;

  let user = await getUserWithOauthId({
    provider: "google",
    email,
  });

  if (user && !user.providerAccountId) {
    await linkUserWithOauth({
      userId: user.id,
      provider: "google",
      providerAccountId: googleUserId,
      avatarUrl: picture,
    });
  }

  if (!user) {
    user = await createUserWithOauth({
      name,
      email,
      provider: "google",
      providerAccountId: googleUserId,
     avatarUrl: picture,

    });
  }
  await authenticateUser({ req, res, user, name, email });

  res.redirect("/");
};

export const getGithubLoginPage = async (req, res) => {
  if (req.user) return res.redirect("/");

  const state = generateState();

  const url = github.createAuthorizationURL(state, ["user:email"]);

   const cookieConfig = {
    httpOnly: true,
    secure: true,
    maxAge: OAUTH_EXCHANGE_EXPIRY,
    sameSite: "lax", 
  };

  res.cookie("github_oauth_state", state, cookieConfig);

  res.redirect(url.toString());
};

export const getGithubLoginCallback = async (req, res) => {
  const { code, state } = req.query;
  const { github_oauth_state: storedState } = req.cookies;

  function handleFailedLogin() {
    req.flash(
      "errors",
      "Couldn't login with GitHub because of invalid login attempt. Please try again!"
    );
    return res.redirect("/login");
  }

  if (!code || !state || !storedState || state !== storedState) {
    return handleFailedLogin();
  }

    let tokens;
  try {
    tokens = await github.validateAuthorizationCode(code);
  } catch {
    return handleFailedLogin();
  }

  const githubUserResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokens.accessToken()}`,
    },
  });
  if (!githubUserResponse.ok) return handleFailedLogin();
  const githubUser = await githubUserResponse.json();
  
  const { id: githubUserId, name, avatar_url } = githubUser;

  const githubEmailResponse = await fetch(
    "https://api.github.com/user/emails",
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
      },
    }
  );

   if (!githubEmailResponse.ok) return handleFailedLogin();

  const emails = await githubEmailResponse.json();
  const email = emails.filter((e) => e.primary)[0].email; 
  if (!email) return handleFailedLogin();

  let user = await getUserWithOauthId({
    provider: "github",
    email,
  });

  if (user && !user.providerAccountId) {
    await linkUserWithOauth({
      userId: user.id,
      provider: "github",
      providerAccountId: githubUserId,
      avatarUrl: avatar_url,
    });
     }

  if (!user) {
    user = await createUserWithOauth({
      name,
      email,
      provider: "github",
      providerAccountId: githubUserId,
      avatarUrl: avatar_url,
    });
  }

  await authenticateUser({ req, res, user, name, email });

  res.redirect("/");
};

export const getSetPasswordPage = async (req, res) => {
  if(!req.user) return res.redirect("/")

    return res.render("auth/set-password", {
      errors: req.flash("errors"),
    })
}

export const postSetPassword = async (req, res) => {
  const {data, error} = setPasswordSchema.safeParse(req.body) 

  if (error) {
    const errorMessages = error.errors.map((err) => err.message)
    req.flash("errors", errorMessages[0])
    return res.redirect(`/set-password`)
  }

  const {newPassword} = data;

  const user = await findUserById(req.user.id)
  if(user.password) {
    req.flash("errors", "You already have your password, Instead chnage your password.")
  } else{
    return res.redirect("/set-password")
  }

  await updateUserPassword({userId: req.user.id, newPassword})

  return res.redirect("/profile")
}
