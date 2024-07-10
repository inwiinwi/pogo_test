import { Router } from "express"
import Utilisateur from "../models/utilisateur.js"
import { authenticateToken } from "../middleware.js"
import { body, param, validationResult } from "express-validator"
import bcrypt from "bcrypt"
const router = Router()

// getUser
router.get("/", authenticateToken, async (req, res) => {
  const { id } = req.user
  try {
    const user = await Utilisateur.findById(id).select([
      "-password",
      "-carteBancaire",
    ])
    if (!user) {
      return res
        .status(404)
        .json({ message: "Utilisateur non trouvé", status: "error" })
    }
    res.json({ status: "success", user })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

// data validator for updateUser
const userValidator = [
  body("nom").trim().notEmpty(),
  body("prenom").trim().notEmpty(),
  body("telephone").trim().notEmpty().isLength({ min: 10 }),
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

// update user
router.put("/update", authenticateToken, userValidator, async (req, res) => {
  const { id } = req.user
  const { nom, prenom, telephone } = req.body
  try {
    // Find the user by ID and update the fields
    const updatedUser = await Utilisateur.findByIdAndUpdate(
      id,
      {
        nom,
        prenom,
        telephone,
      },
      { new: true, runValidators: true } // Return the updated document and run validators
    )

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "Utilisateur non trouvé", status: "error" })
    }

    res.json({ status: "success", message: "User updated successfully" })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

// data validator for carte bancaire
const carteValidator = [
  body("nomProprietaire").trim().notEmpty(),
  body("isdefault").trim().notEmpty().isBoolean(),
  body("numCarte").trim().notEmpty().isNumeric().isLength(16),
  body("cvv").trim().notEmpty().isNumeric().isLength(3),
  body("dateExperation").trim().notEmpty().isISO8601().toDate(),
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

// add carte bancaire

router.post("/addCarte",authenticateToken,carteValidator,
  async (req, res) => {
    try {
      const { nomProprietaire, numCarte, cvv, dateExperation, isdefault } =
        req.body
      const { id } = req.user

      // Find the user by ID
      const utilisateur = await Utilisateur.findById(id)
      if (!utilisateur) {
        return res
          .status(404)
          .json({ message: "Utilisateur non trouvé", status: "error" })
      }

      // Create a new card object
      const newCard = {
        nomProprietaire,
        numCarte,
        cvv,
        dateExperation,
        isdefault,
      }

      const carteNumber = utilisateur.carteBancaire.length
      if (carteNumber == 0) {
        newCard.isdefault = true
      } else if (isdefault == "true") {
        const defaultCard = utilisateur.carteBancaire.find(
          (carte) => carte.isdefault
        )
        if (defaultCard) {
          defaultCard.isdefault = false
        }
      }

      // Add the new card to the user's carteBancaire array
      utilisateur.carteBancaire.push(newCard)

      // Save the updated user
      await utilisateur.save()

      res
        .status(201)
        .json({ message: "Carte ajoutée avec succès", status: "success" })
    } catch (error) {
      console.error(error.message)
      res.status(500).json({ message: error.message, status: "error" })
    }
  }
)

// get default carte bancaire
router.get("/defaultCarte", authenticateToken, async (req, res) => {
  try {
    const { id } = req.user

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: errors.array() })
    }

    // Find the user by ID
    const utilisateur = await Utilisateur.findById(id).select("carteBancaire")
    if (!utilisateur) {
      return res
        .status(404)
        .json({ message: "Utilisateur non trouvé", status: "error" })
    }

    const carteNumber = utilisateur.carteBancaire.length
    if (carteNumber == 0) {
      return res
        .status(404)
        .json({ message: "ajouter une carte bancaire", status: "error" })
    }

    const defaultCard = utilisateur.carteBancaire.find(
      (carte) => carte.isdefault
    )
    if (!defaultCard) {
      return res.status(404).json({ message: "Carte bancaire non trouvée" })
    }

    res.status(201).json({ carte: defaultCard, status: "success" })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

// delete carte bancaire
router.delete(
  "/deleteCarte/:id",
  authenticateToken,
  param("id").trim().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      const { id } = req.user
      const carteID = req.params.id

      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() })
      }

      // Find the user by ID
      const utilisateur = await Utilisateur.findById(id).select("carteBancaire")
      if (!utilisateur) {
        return res
          .status(404)
          .json({ message: "Utilisateur non trouvé", status: "error" })
      }

      const carte = utilisateur.carteBancaire.id(carteID)
      if (!carte) {
        return res
          .status(404)
          .json({ message: "Carte non trouvé", status: "error" })
      }

      // Remove the carte from the user's cartes array
      carte.deleteOne()

      // change default carte to the fisrt carte
      const carteNumber = utilisateur.carteBancaire.length
      if (carteNumber != 0) {
        utilisateur.carteBancaire[0].isdefault = true
      }
      await utilisateur.save()

      res
        .status(201)
        .json({ message: "Carte supprimée avec succès", status: "success" })
    } catch (error) {
      console.error(error.message)
      res.status(500).json({ message: error.message, status: "error" })
    }
  }
)

// change default carte
router.post(
  "/changeDefaultCarte/:id",
  authenticateToken,
  body("id").trim().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      const { id } = req.user
      const carteID = req.params.id

      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() })
      }

      const utilisateur = await Utilisateur.findById(id).select("carteBancaire")
      if (!utilisateur) {
        return res
          .status(404)
          .json({ message: "Utilisateur non trouvé", status: "error" })
      }

      const carte = utilisateur.carteBancaire.id(carteID)
      if (!carte) {
        return res
          .status(404)
          .json({ message: "Carte non trouvé", status: "error" })
      }

      const defaultCard = utilisateur.carteBancaire.find(
        (carte) => carte.isdefault
      )
      if (!defaultCard) {
        return res.status(404).json({ message: "Carte bancaire non trouvée" })
      }

      defaultCard.isdefault = false
      carte.isdefault = true

      await utilisateur.save()

      res
        .status(201)
        .json({ message: "Carte modifiée avec succès", status: "success" })
    } catch (error) {
      console.error(error.message)
      res.status(500).json({ message: error.message, status: "error" })
    }
  }
)

// get all carte of the user
router.post("/allCarte", authenticateToken, async (req, res) => {
  try {
    const { id } = req.user
    const utilisateur = await Utilisateur.findById(id).select("carteBancaire")
    if (!utilisateur) {
      return res
        .status(404)
        .json({ message: "Utilisateur non trouvé", status: "error" })
    }

    res
      .status(201)
      .json({ cartes: utilisateur.carteBancaire, status: "success" })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

router.post("/getUserCarte", authenticateToken, async (req, res) => {
  const { id_user, id_carte } = req.body

  const user = await Utilisateur.findById(id_user)
  if (!user) {
    return res.status(404).json({ message: "Utilisateur non trouvé" })
  }

  const carte = user.carteBancaire.id(id_carte)
  if (!carte) {
    return res.status(404).json({ message: "Carte non trouvée" })
  }

  res.status(200).json({
    user: {
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
    },
    carte,
  })
})

// updatePassword validator
const updatePasswordValidator = [
  body("newPassword").trim().notEmpty().isLength({ min: 8 }),
  body("oldPassword").trim().notEmpty().isLength({ min: 8 }),
  body("confirmePassword")
    .trim()
    .notEmpty()
    .isLength({ min: 8 })
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
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

// update password

router.put("/updatePassword", authenticateToken, async (req, res) => {
  try {
    const { id } = req.user
    const { oldPassword, newPassword } = req.body
    const user = await Utilisateur.findById(id)
    if (!user) {
      return res
        .status(404)
        .json({ message: "Utilisateur non trouvé", status: "error" })
    }

    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return res
        .status(400)
        .send({ message: "password incorrect", status: "error" })
    }

    const cryptedPassword = await bcrypt.hash(newPassword, 10)
    user.password = cryptedPassword
    await user.save()
    res
      .status(200)
      .json({ message: "Mot de passe modifié avec succès", status: "success" })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

export default router
