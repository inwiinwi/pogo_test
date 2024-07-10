import { Router } from "express"
import { authenticateToken } from "../middleware.js"
import { body, validationResult } from "express-validator"
import { parseStringPromise } from "xml2js"
import Utilisateur from "../models/utilisateur.js"
import Paiment from "../models/paiment.js"

const router = Router()

// paiment validator
const paimentValidator = [
  body("amount").trim().notEmpty().isNumeric(),
  body("user_id").trim().notEmpty(),
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

router.post("/", authenticateToken, paimentValidator, async (req, res) => {
  try {
    const { amount, user_id: recepteur_id } = req.body
    const { id: emeteur_id } = req.user

    // recuperatoin des informations nécessaire
    const emeteur = await Utilisateur.findById(emeteur_id).select(
      "carteBancaire"
    )

    const recepteur = await Utilisateur.findById(recepteur_id).select(
      "carteBancaire"
    )

    if (!emeteur || !recepteur) {
      return res
        .status(404)
        .json({ message: "Utilisateur introuvable", status: "error" })
    }

    if (emeteur_id == recepteur_id) {
      return res
        .status(400)
        .json({ message: "Paiment impossible", status: "error" })
    }

    // recuperation de la carte
    if (
      emeteur.carteBancaire.length == 0 ||
      recepteur.carteBancaire.length == 0
    ) {
      return res
        .status(404)
        .json({ message: "aucun carte bancaire trouvé", status: "error" })
    }

    const emeteurCarte = emeteur.carteBancaire.find((carte) => carte.isdefault)
    const recepteurCarte = recepteur.carteBancaire.find(
      (carte) => carte.isdefault
    )
    if (!emeteurCarte || !recepteurCarte) {
      return res.status(404).json({ message: "Carte bancaire non trouvée" })
    }

    // formatage de la date d'expiration
    // const expirationDate = new Date(dateExperation)
    // const month = String(expirationDate.getMonth() + 1).padStart(2, "0") // Adding 1 as getMonth() returns 0-indexed month
    // const year = expirationDate.getFullYear()

    // const formattedExpirationDate = `${month}/${year}`

    // const cmi_api = "https://testpayment.cmi.co.ma/fim/api"

    // // Preauthorization
    // const preRequestPayload = `
    //   <CC5Request>
    //     <Name>pogo_api</Name>
    //     <Password>Pogo_api2022</Password>
    //     <ClientId>600003404</ClientId>
    //     <Type>PreAuth</Type>
    //     <Total>${amount}</Total>
    //     <Currency>504</Currency>
    //     <Number>${numCarte}</Number>
    //     <Expires>${formattedExpirationDate}</Expires>
    //     <Cvv2Val>${cvv}</Cvv2Val>
    //   </CC5Request>
    // `
    // const preRequestResponse = await fetch(cmi_api, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/xml",
    //   },
    //   body: preRequestPayload,
    // })

    // const preRequestResponseText = await preRequestResponse.text()

    // const { CC5Response: preResponse } = await parseStringPromise(
    //   preRequestResponseText,
    //   {
    //     explicitArray: false,
    //   }
    // )

    // if (preResponse.Response == "Declined" || preResponse.Response == "Error") {
    //   await new Paiment({
    //     emeteur: emeteur_id,
    //     destinataire: recepteur_id,
    //     cartebancaireEmeteur: emeteurCarte.id,
    //     cartebancaireDestinataire: recepteurCarte.id,
    //     montant: amount,
    //     dateOperation: new Date(),
    //     Etat_de_la_transaction: "échouer",
    //     remarque: preResponse.ErrMsg,
    //   }).save()

    //   return res
    //     .status(400)
    //     .json({ message: preResponse.ErrMsg, status: preResponse.Response })
    // }

    // Postauthorization
    // const postRequestPayload = `
    //   <CC5Request>
    //     <Name>pogo_api</Name>
    //     <Password>Pogo_api2022</Password>
    //     <ClientId>600003404</ClientId>
    //     <Type>PostAuth</Type>
    //     <OrderId>${preResponse.OrderId}</OrderId>
    //   </CC5Request>
    // `
    // const postRequestResponse = await fetch(cmi_api, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/xml",
    //   },
    //   body: preRequestPayload,
    // })
    // const postRequestResponseText = await postRequestResponse.text()

    // const { CC5Response: postResponse } = await parseStringPromise(
    //   postRequestResponseText,
    //   {
    //     explicitArray: false,
    //   }
    // )

    // if (
    //   postResponse.Response == "Declined" ||
    //   postResponse.Response == "Error"
    // ) {
    //   await new Paiment({
    //     emeteur: emeteur_id,
    //     destinataire: recepteur_id,
    //     cartebancaireEmeteur: emeteurCarte.id,
    //     cartebancaireDestinataire: recepteurCarte.id,
    //     montant: amount,
    //     dateOperation: new Date(),
    //     Etat_de_la_transaction: "échouer",
    //     remarque: postResponse.ErrMsg,
    //   }).save()
    //   return res
    //     .status(400)
    //     .json({ message: postResponse.ErrMsg, status: postResponse.Response })
    // }

    // transaction reussite
    await new Paiment({
      emeteur: emeteur_id,
      destinataire: recepteur_id,
      cartebancaireEmeteur: emeteurCarte.id,
      cartebancaireDestinataire: recepteurCarte.id,
      montant: amount,
      dateOperation: new Date(),
      Etat_de_la_transaction: "en cours",
      remarque: "Paiment est en cours de traitement",
    }).save()
    console.log("nice")

    return res.status(200).json({ message: "Paiment success" })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

// historique
router.get("/historique", authenticateToken, async (req, res) => {
  try {
    const { id } = req.user
    const historique = await Paiment.find({ emeteur: id })
      .populate({
        path: "destinataire",
        select: ["nom", "prenom", "telephone", "carteBancaire"],
      })
      .exec()
    res.status(200).json({ historique })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

router.get("/historique/:etat", async (req, res) => {
  try {
    const { etat } = req.params
    let historique = await Paiment.find()
      .populate({
        path: "emeteur",
        select: ["nom", "prenom", "telephone", "carteBancaire"],
      })
      .populate({
        path: "destinataire",
        select: ["nom", "prenom", "telephone", "carteBancaire"],
      })
      .exec()

    switch (etat) {
      case "encours":
        historique = historique.filter(
          (doc) => doc.Etat_de_la_transaction == "en cours"
        )
        break
      case "echouee":
        historique = historique.filter(
          (doc) => doc.Etat_de_la_transaction == "échouer"
        )
        break
      case "reussie":
        historique = historique.filter(
          (doc) => doc.Etat_de_la_transaction == "reussie"
        )
        break

      default:
        historique = []
        break
    }

    historique.forEach((doc) => {
      if (doc.emeteur && doc.emeteur.carteBancaire) {
        doc.emeteur.carteBancaire = doc.emeteur.carteBancaire.filter(
          (carte) => carte.id === doc.cartebancaireEmeteur.toString()
        )
      }
      if (doc.destinataire && doc.destinataire.carteBancaire) {
        doc.destinataire.carteBancaire = doc.destinataire.carteBancaire.filter(
          (carte) => carte.id === doc.cartebancaireDestinataire.toString()
        )
      }
    })

    res.send(historique)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

router.put("/etat", async (req, res) => {
  try {
    const { id, etat } = req.body
    await Paiment.findByIdAndUpdate(id, { Etat_de_la_transaction: etat })
    res.send({
      message: "Etat de la transaction modifié avec succès",
      status: "success",
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

export default router
