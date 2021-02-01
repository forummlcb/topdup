import { CODE, ID } from "../constants";
import { secretKey, endPointImage } from "../configs";
import jwt from "jsonwebtoken";
import { schema } from "../validations/schema";
import Joi from "joi";

export const isVerifiedToken = async (req, res, next) => {
  if (req.get("Authorization") === undefined) {
    res.json({
      code: CODE.INVALID_TOKEN,
      message: "Thiếu dữ liệu Authorization và Access Token"
    });
    return;
  }
  const accessToken = req.get("Authorization");
  if (accessToken) {
    jwt.verify(accessToken, secretKey, async (err, decoded) => {
      if (err) {
        res.json({
          code: CODE.INVALID_TOKEN,
          message: "Không thể xác thực token",
          error: err
        });
      } else {
        next()
      }
    });

  } else {
    res.json({
      code: CODE.INVALID_TOKEN,
      message: "Access token không được để rỗng!"
    });
  }
};

const fieldValidation = (input, template) => {
  for (let item of template) {
    if (!Object.prototype.hasOwnProperty.call(input, item)) {
      return item;
    }
  }
  return null;
};

// check data field when request
export const requiredField = async (req, res, body, params, query, next) => {
  const bodyChecked = fieldValidation(req.body, body);
  const paramChecked = fieldValidation(req.params, params);
  const queryChecked = fieldValidation(req.query, query);

  if (bodyChecked) {
    res.json({
      code: CODE.MISSING_BODY,
      message: 'Lỗi thiếu dữ liệu',
      error: `Missing! You are missing body field: [${bodyChecked}]`
    });
  } else if (queryChecked) {
    res.json({
      code: CODE.MISSING_QUERY,
      message: 'Lỗi thiếu dữ liệu',
      error: `Missing! You are missing query field: [${queryChecked}]`
    });
  } else if (paramChecked) {
    res.json({
      code: CODE.MISSING_PARAMS,
      message: 'Lỗi thiếu dữ liệu',
      error: `Missing! You are missing params field: [${paramChecked}]`
    });
  } else {
    next();
  }
};

export const validateField = async (req, res, next) => {
  const bodyChecked = Joi.validate(req.body, schema);
  const paramChecked = Joi.validate(req.params, schema);
  const queryChecked = Joi.validate(req.query, schema);
  if (bodyChecked.error) {
    console.log(bodyChecked);
    res.json({
      code: CODE.INVALID_PARAMS,
      message: 'Lỗi định dạng dữ liệu',
      error: bodyChecked.error.details
    });
  } else if (queryChecked.error) {
    res.json({
      code: CODE.INVALID_QUERY,
      message: 'Lỗi định dạng dữ liệu',
      error: queryChecked.error.details
    });
  } else if (paramChecked.error) {
    res.json({
      code: CODE.MISSING_BODY,
      message: 'Lỗi định dạng dữ liệu',
      error: paramChecked.error.details
    });
  } else {
    next();
  }
};

