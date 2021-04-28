import Joi from "joi"
import jwt from "jsonwebtoken"
import { secretKey } from "../configs"
import { CODE } from "../constants"
import { schema } from "../validations/schema"

export const isVerifiedToken = async (req, res, next) => {
  if (req.get("Authorization") === undefined) {
    res.json({
      code: CODE.INVALID_TOKEN,
      message: "Thiếu dữ liệu Authorization và Access Token"
    })
    return
  }
  const accessToken = req.get("Authorization")
  if (accessToken) {
    jwt.verify(accessToken, secretKey, async (err, decoded) => {
      if (err) {
        res.json({
          code: CODE.INVALID_TOKEN,
          message: "Không thể xác thực token",
          error: err
        })
      } else {
        next()
      }
    })

  } else {
    res.json({
      code: CODE.INVALID_TOKEN,
      message: "Access token không được để rỗng!"
    })
  }
}

const hasMissingField = (input, template) => {
  for (let item of template) {
    if (!Object.prototype.hasOwnProperty.call(input, item)) {
      return item
    }
  }
  return null
}

// check data field when request
export const requiredField = async (req, response, bodyFields, paramFields, queryFields, next) => {
  const missingBodyField = hasMissingField(req.body, bodyFields)
  const missingQueryField = hasMissingField(req.query, queryFields)
  const missingParamField = hasMissingField(req.params, paramFields)

  let message = ''

  if (missingBodyField) {
    message = `Missing! You are missing body field: [${ missingBodyField }]`
    response.status(CODE.MISSING_BODY).json({ message })
  }

  if (missingQueryField) {
    message = `Missing! You are missing query field: [${ missingQueryField }]`
    response.status(CODE.MISSING_QUERY).json({ message })
  }

  if (missingParamField) {
    message = `Missing! You are missing param field: [${ missingParamField }]`
    response.status(CODE.MISSING_PARAMS).json({ message })
  }

  next(message)
}

export const validateField = async (req, response, next) => {
  const bodyChecked = Joi.validate(req.body, schema)
  const queryChecked = Joi.validate(req.query, schema)
  const paramChecked = Joi.validate(req.params, schema)

  let message = ''

  if (bodyChecked.error) {
    message = `Lỗi định dạng dữ liệu - ${ bodyChecked.error.details }`
    response.jsonResponse = { message }
    response.status(CODE.MISSING_BODY).json({ message })
  }

  if (queryChecked.error) {
    message = `Lỗi định dạng dữ liệu - ${ queryChecked.error.details }`
    response.jsonResponse = { message }
    response.status(CODE.INVALID_QUERY).json({ message })
  }

  if (paramChecked.error) {
    message = `Lỗi định dạng dữ liệu - ${ paramChecked.error.details }`
    response.jsonResponse = { message }
    response.status(CODE.INVALID_PARAMS).json({ message })
  }

  next()
}


