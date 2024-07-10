import { Schema, Types, model } from "mongoose"

const paimentSchema = new Schema({
  dateOperation: { type: Date, required: true },
  montant: { type: Types.Decimal128, required: true },
  Etat_de_la_transaction: { type: String, required: true },
  emeteur: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  destinataire: {
    type: Schema.Types.ObjectId,
    ref: "Utilisateur",
    required: true,
  },
  cartebancaireEmeteur: { type: Schema.Types.ObjectId, required: true},
  cartebancaireDestinataire: { type: Schema.Types.ObjectId, required: true },
  remarque: { type: String, required: true },
})

const Paiment = model("Paiment", paimentSchema)

export default Paiment
