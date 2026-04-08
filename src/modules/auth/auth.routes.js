const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  logout,
  getMe,
  refreshAccessToken,
} = require("./auth.controller");
const { signupValidation, loginValidation } = require("./auth.validation");
const { verifyJWT } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Register, login, logout and session management.
 */

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - mobile
 *               - password
 *               - confirmPassword
 *               - dateOfBirth
 *               - gender
 *               - agreedToTerms
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 60
 *                 example: Ahmed Al-Rashidi
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ahmed@example.com
 *               mobile:
 *                 type: string
 *                 description: Saudi format +966XXXXXXXXX
 *                 example: "+966512345678"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Must contain at least one number
 *                 example: "pass123"
 *               confirmPassword:
 *                 type: string
 *                 description: Must match password
 *                 example: "pass123"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1995-06-15"
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *                 example: male
 *               accountStatus:
 *                 type: string
 *                 enum: [individual, institution]
 *                 default: individual
 *                 example: individual
 *               country:
 *                 type: string
 *                 default: Saudi Arabia
 *                 example: Saudi Arabia
 *               city:
 *                 type: string
 *                 example: Riyadh
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Parent of two kids interested in educational activities."
 *               interestAgeGroups:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: ["3-6", "6-9", "9-12", "12-15"]
 *                 example: ["3-6", "6-9"]
 *               interestFields:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum:
 *                     - Family and social
 *                     - Imany
 *                     - Behavioral and ethical
 *                     - Mental
 *                     - Language and Communication
 *                     - Sharia science
 *                     - Psychological and self-management
 *                 example: ["Family and social", "Imany"]
 *               agreedToTerms:
 *                 type: string
 *                 enum: ["true"]
 *                 description: Must be the string "true"
 *                 example: "true"
 *     responses:
 *       201:
 *         description: Account created successfully
 *         headers:
 *           Set-Cookie:
 *             description: Sets accessToken and refreshToken as httpOnly cookies
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:    { type: boolean, example: true }
 *                 statusCode: { type: integer, example: 201 }
 *                 message:    { type: string,  example: "Account created successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string, example: "eyJhbGciOiJIUz..." }
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:           { type: string }
 *                         username:      { type: string, example: "Ahmed Al-Rashidi" }
 *                         email:         { type: string, example: "ahmed@example.com" }
 *                         mobile:        { type: string, example: "+966512345678" }
 *                         role:          { type: string, example: "member" }
 *                         accountStatus: { type: string, example: "individual" }
 *                         createdAt:     { type: string, format: date-time }
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: Validation failed
 *               errors:
 *                 - "Password must contain at least one number"
 *                 - "Passwords do not match"
 *       409:
 *         description: Email or mobile already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               success: false
 *               statusCode: 409
 *               message: "An account with this email already exists"
 */
router.post("/signup", signupValidation, signup);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@test.com
 *               password:
 *                 type: string
 *                 example: "password@1"
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: Sets accessToken and refreshToken httpOnly cookies
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string,  example: "Logged in successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string, example: "eyJhbGciOiJIUz..." }
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:           { type: string }
 *                         username:      { type: string }
 *                         email:         { type: string }
 *                         role:          { type: string, example: "member" }
 *                         avatar:        { type: string }
 *                         accountStatus: { type: string }
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: "Invalid email or password"
 */
router.post("/login", loginValidation, login);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Get a new access token silently
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token issued
 *         headers:
 *           Set-Cookie:
 *             description: Replaces both cookies with fresh tokens
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:     { type: boolean, example: true }
 *                 message:     { type: string,  example: "Token refreshed successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string, example: "eyJhbGciOiJIUz..." }
 *       401:
 *         description: Refresh token missing, expired, or already used
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: "Refresh token already used. Please log in again."
 */
router.post("/refresh-token", refreshAccessToken);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Logged out successfully"
 *               data: {}
 *       401:
 *         description: Not logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post("/logout", verifyJWT, logout);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:                { type: string }
 *                         username:           { type: string, example: "Ahmed Al-Rashidi" }
 *                         email:              { type: string, example: "ahmed@example.com" }
 *                         mobile:             { type: string, example: "+966512345678" }
 *                         role:               { type: string, example: "member" }
 *                         gender:             { type: string, example: "male" }
 *                         dateOfBirth:        { type: string, format: date-time }
 *                         accountStatus:      { type: string, example: "individual" }
 *                         country:            { type: string, example: "Saudi Arabia" }
 *                         city:               { type: string, example: "Riyadh" }
 *                         bio:                { type: string }
 *                         avatar:             { type: string }
 *                         interestAgeGroups:  { type: array, items: { type: string } }
 *                         interestFields:     { type: array, items: { type: string } }
 *                         notificationPrefs:
 *                           type: object
 *                           properties:
 *                             email: { type: boolean }
 *                             push:  { type: boolean }
 *                             sms:   { type: boolean }
 *                         createdAt: { type: string, format: date-time }
 *       401:
 *         description: Not logged in or token expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get("/me", verifyJWT, getMe);

module.exports = router;
