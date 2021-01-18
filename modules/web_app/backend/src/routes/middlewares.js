import { CODE, ID } from "../constants";
import { secretKey, endPointImage } from "../config";
import jwt from "jsonwebtoken";
import { schema } from "../vadilations/schema";
import Joi from "joi";
import Device from "../models/device"

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
        const check = await Device.findOne(
          {
            $and: [
              { user: decoded.id },
              { baseToken: decoded.baseToken }
            ]
          }
        )
        if (check) {
          next()
        }
        else {
          res.json({
            code: CODE.INVALID_TOKEN,
            message: 'Người dùng không tồn tại trong hệ thống!'
          });
        }

      }
    });

  } else {
    res.json({
      code: CODE.INVALID_TOKEN,
      message: "Access token không được để rỗng!"
    });
  }
};
export const isVerifiedClient = (req, res, next) => {
  if (req.get('X-App-Client-Secret') === undefined) {
    res.json({
      code: CODE.INVALID_APP_SECRET,
      message: 'Request thiếu dữ liệu Client Secret'
    });
    return;
  }
  const clientSecret = req.get('X-App-Client-Secret');
  if (clientSecret === config.appClientSecret) {
    next();
  } else {
    res.json({
      code: CODE.INVALID_APP_SECRET,
      message: 'Client Secret không được để rỗng!'
    });
  }
};
// 0 admin, 1 user,
// middleware check role of user access next function
export const isAdmin = (req, res, next) => {
  if (!req.user.role === 0) {
    res.json({
      code: CODE.PERMISSON_DENIED,
      message: 'Permission denied!'
    });
    return;
  }
  next();
};

export const isClient = (req, res, next) => {
  if (!req.user.role === 1) {
    res.json({
      code: CODE.PERMISSON_DENIED,
      message: 'Permission denied!'
    });
    return;
  }
  next();
};

// set default role by path router
export const setAdmin = (req, res, next) => {
  req.role = ID.ADMIN;
  next();
};
export const setClient = (req, res, next) => {
  req.role = ID.USER;
  next();
};

export const setPathPrefix = (req, res, prefix, next) => {
  req.pathPrefix = prefix;
  next();
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


export const checkUpLoad = (req, res, next) => {
  if (typeof req.file !== undefined) {
    res.json({
      code: CODE.SUCCESS,
      data: {
        url: endPointImage + "/temp?imageName=" + req.file.filename,
        imageName: req.file.filename
      },
      message: "Upload successful"
    });
  } else {
    res.json({
      code: CODE.ERROR,
      date: req.file.filename,
      message: "Upload error"
    });
  }
};
