import { Router } from "express"
import Utilisateur from "../models/utilisateur.js"
import { generateAccessToken } from "../middleware.js"
import bcrypt from "bcrypt"
import { body, validationResult } from "express-validator"

const router = Router()

// data validator for login
const loginValidator = [
  body("login").trim().notEmpty(),
  body("password").trim().notEmpty().isLength({ min: 8 }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: errors.array() })
    }
    next()
  },
]

// login

router.post("/login", loginValidator, async (req, res) => {
  try {
    const { login, password } = req.body
    const user = await Utilisateur.findOne({ telephone: login }).select(
      "-carteBancaire"
    )
    if (!user) {
      return res.status(400).send({ message: "User not found", status: "error" })
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).send({ message: "password incorrect", status: "error" })
    }

    const token = generateAccessToken(user.id)
    res.send({
      message: "User logged in successfully",
      status: "success",
      data: {
        token,
        user,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message, status: "error" })
  }
})

// data validator for register

const registreValidator = [
  body("nom").trim().notEmpty(),
  body("prenom").trim().notEmpty(),
  body("telephone").trim().notEmpty().isLength({ min: 10 }),
  body("password").trim().notEmpty().isLength({ min: 8 }),
  body("confirmePassword")
    .trim()
    .notEmpty()
    .isLength({ min: 8 })
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password")
      }
      return true
    }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: errors.array() })
    }
    next()
  },
]

// register

router.post("/registre", registreValidator, async (req, res) => {
  try {
    const { nom, prenom, telephone, password } = req.body
    const cryptedPassword = await bcrypt.hash(password, 10)
    const user = new Utilisateur({
      nom,
      prenom,
      telephone,
      password: cryptedPassword,
    })
    await user.save()
    res.send({ message: "User created successfully", status: "success" })
  } catch (error) {
    res.status(500).json({ message: error.message, status: "error" })
    console.error(error)
  }
})

// phone validation
// router.post("/phoneValidation", async (req, res) => {

// })

export default router
