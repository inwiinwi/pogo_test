import { config } from "dotenv"
import jwt from "jsonwebtoken"

// get config vars
config()

export function generateAccessToken(id) {
  return jwt.sign({ id: id }, process.env.TOKEN_SECRET, { expiresIn: "1d" })
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (token == null) return res.sendStatus(401)

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)

    req.user = user

    next()
  })
}
