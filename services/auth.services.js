import { and, eq, gte, isNull, lt, sql } from "drizzle-orm"
import { db } from "../config/db.js"
import { oauthAccountsTable, passwordResetTokenTable, sessionsTable, shortLinksTable, usersRegistration, verifyEmailTokensTable } from "../drizzle/schema.js"
import argon2 from "argon2";
import crypto from "crypto"
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY, MILLISECONDS_PER_SECOND, REFRESH_TOKEN_EXPIRY } from "../config/constants.js";
import { URL } from "url";
import {sendEmail} from "../lib/send-email.js"
import path from "path";
import fs from "fs/promises"
import mjml2html from "mjml";
import ejs from "ejs"

export const getUserByEmail = async (email) => {
  const [user] = await db.select().from(usersRegistration).where(eq(usersRegistration.email, email))
  return user;
}

export const createUsers = async ({ name, email, password }) => {
  return await db.insert(usersRegistration).values({ name, email, password }).$returningId();
}

export const hashPassword = async (password) => {
  return await argon2.hash(password);
}

export const comparePassword = async (password, hash) => {
  return await argon2.verify(hash, password);
}

export const createSession = async (userId, { ip, userAgent }) => {
  const [session] = await db.insert(sessionsTable).values({ userId, ip, userAgent }).$returningId();
  return session;
}

export const createAccessToken = ({ id, name, email, sessionId }) => {
  return jwt.sign({ id, name, email, sessionId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY / MILLISECONDS_PER_SECOND,         //15 min
  })
}

export const createRefreshToken = ({ sessionId }) => {
  return jwt.sign({ sessionId }, process.env.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY / MILLISECONDS_PER_SECOND,         //1 week
  })
}

export const verifyJWToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export const findSessionById = async (sessionId) => {
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId))
  return session;
}

export const findUserById = async (userId) => {
  const [user] = await db.select().from(usersRegistration).where(eq(usersRegistration.id, userId))
  return user;
}

export const refreshTokens = async (refreshToken) => {
  try {
    const decodeToken = verifyJWToken(refreshToken)
    const currentSession = await findSessionById(decodeToken.sessionId)

    if (!currentSession || !currentSession.valid) {
      throw new Error("Invalid session")
    }

    const user = await findUserById(currentSession.userId)

    if (!user) throw new Error("Invalid User.")

    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      isEmailValid: user.isEmailValid,
      sessionId: currentSession.id
    }

    //! create access token
    const newAccessToken = createAccessToken(userInfo)

    //! create refresh token
    const newRefreshToken = createRefreshToken(currentSession.id)

    return {
      newAccessToken,
      newRefreshToken,
      user: userInfo
    }

  } catch (error) {
    console.log("Refresh token error", error.message);
    return null;
  }
}

export const clearUserSession = (sessionId) => {
  return db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId))
}

export const authenticateUser = async ({ req, res, user, name, email }) => {
  //! we need to create session
  const session = await createSession(user.id, {
    ip: req.clientIp,
    userAgent: req.headers["user-agent"]
  })

  const accessToken = createAccessToken({
    id: user.id,                    //! createUser sirf id return kar raha tha
    name: user.name || name,                   //! data m se name aur email liya gaya hai
    email: user.email || email,
    isEmailValid: false,
    sessionId: session.id,
  })

  //! create refresh token
  const refreshToken = createRefreshToken({ sessionId: session.id })

  const baseConfig = { httpOnly: true, secure: true };

  res.cookie("access_token", accessToken, {
    ...baseConfig,
    maxAge: ACCESS_TOKEN_EXPIRY,
  })

  res.cookie("refresh_token", refreshToken, {
    ...baseConfig,
    maxAge: REFRESH_TOKEN_EXPIRY,
  })

}

export const getAllShortLinks = (userId) => {
  return db.select().from(shortLinksTable).where(eq(shortLinksTable.userId, userId))
}

export const generateRandomToken = async (digit = 8) => {
  const min = 10 ** (digit - 1)   //! 10000000
  const max = 10 ** (digit)       //! 100000000

  return crypto.randomInt(min, max).toString();
}

export const insertVerifyEmailToken = async ({ userId, token }) => {

  return db.transaction(async (tx) => {
    try {
      await tx.delete(verifyEmailTokensTable).where(lt(verifyEmailTokensTable.expiresAt, sql`CURRENT_TIMESTAMP`))

      await tx.delete(verifyEmailTokensTable).where(lt(verifyEmailTokensTable.userId, userId))


      await tx.insert(verifyEmailTokensTable).values({ userId, token })
    } catch (error) {
      console.log(" Failed to insert verification token: ", error);
      throw new Error(" Unable to create verification token");

    }
  })
}

export const createVerifyEmailLink = async ({ email, token }) => {

  const url = new URL(`${process.env.FRONTEND_URL}/verify-email-token`)

  url.searchParams.append("token", token)
  url.searchParams.append("email", email)
  return url.toString();
}

export const findVerificationEmailToken = async ({ token, email }) => {
  return db.select({
    userId: usersRegistration.id,
    email: usersRegistration.email,
    token: verifyEmailTokensTable.token,
    expiresAt: verifyEmailTokensTable.expiresAt,
  })
    .from(verifyEmailTokensTable)
    .where(
      and(
        eq(verifyEmailTokensTable.token, token),
        gte(verifyEmailTokensTable.expiresAt, sql`CURRENT_TIMESTAMP`)),
      eq(usersRegistration.email, email)
    ).innerJoin(usersRegistration, eq(verifyEmailTokensTable.userId, usersRegistration.id))
}

export const verifyUserEmailAndUpdate = async (email) => {
  return db.update(usersRegistration).set({ isEmailValid: true })
    .where(eq(usersRegistration.email, email))
}

export const clearVerifyEmailToken = async (email) => {
  const [user] = await db.select().from(usersRegistration)
    .where(eq(usersRegistration.email, email))

  return await db.delete(verifyEmailTokensTable)
    .where(eq(verifyEmailTokensTable.userId, usersRegistration.id))
}

export const sendVerifyEmailLink = async ({userId, email}) => {
  const randomToken = await generateRandomToken()
  
    await insertVerifyEmailToken({ userId, token: randomToken })
  
    const verifyEmailLink = await createVerifyEmailLink({
      email,
      token: randomToken,
    })

    const mjmlTemplate = await fs.readFile(path.join(import.meta.dirname,"..","emails","verify-email.mjml"), "utf-8")

    const filledTemplate = ejs.render(mjmlTemplate, {
      code: randomToken,
      link: verifyEmailLink
    })
  
const htmlOutput= mjml2html(filledTemplate).html

    sendEmail({
  to: email,
  subject: "Verify your email",
  html: htmlOutput,
  }).catch(console.error)
}

export const updateUserByName = async ({userId, name, avatarUrl}) => {
return db.update(usersRegistration)
.set({name: name, avatarUrl: avatarUrl})
.where(eq(usersRegistration.id, userId))
}

export const updateUserPassword = async ({userId, newPassword}) => {
const newHashedPassword = await hashPassword(newPassword)

return await db.update(usersRegistration)
.set({password: newHashedPassword})
.where(eq(usersRegistration.id, userId))
}

export const findUserByEmail = async (email) => {
const [user] = await db.select().from(usersRegistration)
.where(eq(usersRegistration.email, email))

return user;
}

export const createResetPasswordLink = async ({userId}) => {
const randomToken = crypto.randomBytes(32).toString("hex")

const tokenHash = crypto.createHash("sha256").update(randomToken).digest("hex")

await db.delete(passwordResetTokenTable).where(eq(passwordResetTokenTable.userId, userId))

await db.insert(passwordResetTokenTable).values({userId, tokenHash})

return `${process.env.FRONTEND_URL}/reset-password/${randomToken}`
}

export const getResetPasswordToken = async (token) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

  const [data] = await db.select().from(passwordResetTokenTable)
  .where(
    and(
    eq(passwordResetTokenTable.tokenHash, tokenHash), 
    gte(passwordResetTokenTable.expiresAt, sql`CURRENT_TIME`)
    ))

  return data;
}

export const clearResetPasswordToken = async (userId) => {
return await db.delete(passwordResetTokenTable)
.where(eq(passwordResetTokenTable.userId, userId))

}

export async function getUserWithOauthId({ email, provider }) {
  const [user] = await db
    .select({
      id: usersRegistration.id,
      name: usersRegistration.name,
      email: usersRegistration.email,
      isEmailValid: usersRegistration.isEmailValid,
      providerAccountId: oauthAccountsTable.providerAccountId,
      provider: oauthAccountsTable.provider,
    })
    .from(usersRegistration)
    .where(eq(usersRegistration.email, email))
    .leftJoin(
      oauthAccountsTable,
      and(
        eq(oauthAccountsTable.provider, provider),
        eq(oauthAccountsTable.userId, usersRegistration.id)
      )
    );

  return user;
}

export async function linkUserWithOauth({
  userId,
  provider,
  providerAccountId,
  avatarUrl,
}) {
  await db.insert(oauthAccountsTable).values({
    userId,
    provider,
    providerAccountId,
  });

  if(avatarUrl) {
    await db.update(usersRegistration)
    .set({avatarUrl})
    .newHashedPassword(and(eq(usersRegistration.id, userId), isNull(usersRegistration.avatarUrl)))
  }
}

export async function createUserWithOauth({
  name,
  email,
  provider,
  avatarUrl,
  providerAccountId,
}) {
  const user = await db.transaction(async (trx) => {
    const [user] = await trx
      .insert(usersRegistration)
      .values({
        email,
        name,
        // password: "",
      avatarUrl,
        isEmailValid: true, // we know that google's email are valid
      })
      .$returningId();

    await trx.insert(oauthAccountsTable).values({
      provider,
      providerAccountId,
      userId: user.id,
    });
    return {
      id: user.id,
      name,
      email,
      isEmailValid: true, 
      provider,
      providerAccountId,
    };
  });

return user;
}
