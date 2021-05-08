import axios from "axios"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { v4 as uuidv4 } from "uuid"
import { externalAuthUrl, hostName, secretKey } from "../configs/index"
import { CODE } from "../constants/index"
import createPool from "./pool.js"
import transporter from "./utils/nodemailer"



const pool = createPool(process.env.POOL_HOST,
  process.env.POOL_DB_NAME,
  process.env.POOL_USR,
  process.env.POOL_PWD)

const generatorToken = (userId, baseToken) => {
  return jwt.sign(
    {
      id: userId,
      baseToken
    },
    secretKey
  )
}

const confirmEmail = async (req, res) => {
  try {
    const { userId, secret_code } = req.params
    const queryIsExist = `
    SELECT *
    FROM public."user"
    WHERE id = '${ userId }' AND secret_code = '${ secret_code }'
    `
    let isExist = await pool.query(queryIsExist)
    if (isExist.rows.length != 0) {
      const queryUpdate = `
        UPDATE public."user"
        SET is_verified = '${ true }'
        WHERE id = '${ userId }'
      `
      await pool.query(queryUpdate)
      res.json({
        code: CODE.SUCCESS,
        message: "Xác thực thành công!"
      })
    }
  } catch (error) {
    throw error
  }
}

const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body
    let queryIsExist = `
        SELECT *
        FROM public."user"
        WHERE email =  '${ email }'
        `

    let isExist = await pool.query(queryIsExist)
      .catch(next)

    if (isExist && isExist.rows && isExist.rows.length != 0) {
      res.status(CODE.OBJECT_EXIST).send({ message: "Email đã được đăng kí" })
      return
    }

    const hashPassword = bcrypt.hashSync(password, 8)
    console.log(hashPassword)
    const secretCode = Math.ceil(Math.random() * 10000)

    const queryAddNewUser = `
            INSERT INTO public."user" (firstName, lastName, email, password,login, thumbnail, is_verified , secret_code, account_type)
            VALUES ('${ firstName }',' ${ lastName }','${ email }', '${ hashPassword }', 'false', 'xxx.yyy', 'false' , '${ secretCode }', 'default')
            RETURNING *
          `
    const result = await pool.query(queryAddNewUser)

    var mailOptions = {
      from: process.env.WEB_EMAIL,
      to: result.rows[0].email,
      subject: "Sending Email using Node.js",
      text: `Please use the following link within the next 10 minutes to activate your account on xxx APP: ${ hostName }/api/v1/auth/verification/verify-account/${ result.rows[0].id }/${ secretCode }`,
      html: `<p>Please use the following link within the next 10 minutes to activate your account on xxx APP:
                ${ hostName }/api/v1/auth/verification/verify-account/${ result.rows[0].id }/${ secretCode }
                <strong><a href="${ hostName }/api/v1/auth/verification/verify-account/${ result.rows[0].id }/${ secretCode }" target="_blank">Email Topdup.xyz</a></strong></p>`
    }

    await transporter.sendMail(mailOptions).catch(next)

    if (!result) {
      res.status(CODE.ERROR).send({ message: "Đăng ký thất bại!" })
      return
    }

    const responseContent = {
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: `${ result.rows[0].firstname } ${ result.rows[0].lastname }`,
        verify: result.rows[0].is_verified
      },
      message: 'Đăng kí thành công'
    }

    console.log(responseContent)

    res.status(CODE.SUCCESS).send(responseContent)
  } catch (error) {
    next(error)
  }
}

const loginNormal = async (req, res) => {
  try {
    const { email, password } = req.body
    console.log('email', email)
    console.log('password', password)
    const query = `
      SELECT *
      FROM public."user"
      WHERE email = '${ email }'
    `
    let result = await pool.query(query)
    if (result.rows.length === 0) {
      res.status(CODE.INVALID).send({ message: "Tài khoản không đúng!" })
    }

    const dbPassword = result.rows[0].password
    if (!dbPassword) {
      const accountType = result.rows[0]['account_type']
      let message = ''
      if (accountType === 'facebook') message = 'Email đã được dùng để đăng nhập bằng FaceBook'
      if (accountType === 'google') message = 'Email đã được dùng để đăng nhập bằng Google'
      res.status(CODE.INVALID).send({ message })
    }

    const compare = bcrypt.compareSync(password, dbPassword)
    if (!compare) {
      res.status(CODE.INVALID).send({ message: "Mật khẩu không đúng!" })
    }

    const accessToken = generatorToken(result.rows[0].id, uuidv4())
    let responseObj = {
      user: {
        id: result.rows[0].id,
        name: `${ result.rows[0].firstname } ${ result.rows[0].lastname }`,
        thumbnail: result.rows[0].thumbnail,
        is_verified: result.rows[0].is_verified
      },
      accessToken: accessToken,
      message: "Đăng nhập thành công!"
    }
    res.status(CODE.SUCCESS).send(responseObj)
  } catch (error) {
    throw error
  }
}

const logout = async (req, res) => {
  try {
    res.json({
      code: CODE.SUCCESS,
      message: "Đăng xuất thành công!"
    })
  } catch (error) {
    throw error
  }
}

const loginByFaceBook = async (req, res) => {
  try {
    const { fbToken, fbId } = req.body
    const param = `me?fields=id,last_name,first_name,name,email,picture{height,cache_key,is_silhouette,url,width},gender`
    const response = await axios.get(
      `${ externalAuthUrl.fb }/${ param }&access_token=${ fbToken }`
    )
    const fbInfo = response.data
    if (response.status === CODE.SUCCESS && fbInfo.id === fbId) {
      let queryIsExist = `
             SELECT *
                FROM public."user"
                WHERE email = '${ fbInfo.email }'
                `
      let isExist = await pool.query(queryIsExist)
      if (isExist.rows.length != 0) {
        const queryUpdate = `
                UPDATE public."user"
                SET email = '${ fbInfo.email }', thumbnail = '${ fbInfo.picture.data.url }', account_type = 'facebook'
                WHERE id = '${ isExist.rows[0].id }'
                RETURNING *
                `
        const result = await pool.query(queryUpdate)
        const accessToken = generatorToken(result.rows[0].id, uuidv4())
        res.status(CODE.SUCCESS).json({
          user: {
            id: result.rows[0].id,
            name: `${ result.rows[0].firstname } ${ result.rows[0].lastname }`,
            thumbnail: result.rows[0].thumbnail,
            is_verified: result.rows[0].is_verified
          },
          accessToken: accessToken,
          message: "Đăng nhập thành công!"
        })
      } else {
        const queryNewUser = `
            INSERT INTO public."user" (firstName, lastName, thumbnail, email,login,  is_verified, account_type)
            VALUES ('${ fbInfo.first_name }','${ fbInfo.last_name }', '${ fbInfo.picture.data.url }','${ fbInfo.email }','true','true', 'facebook')
            RETURNING *
            `
        const result = await pool.query(queryNewUser)
        if (result) {
          const accessToken = generatorToken(result.id, uuidv4())
          res.status(CODE.SUCCESS).json({
            user: {
              id: result.rows[0].id,
              name: `${ result.rows[0].firstname } ${ result.rows[0].lastname }`,
              is_verified: result.rows[0].is_verified
            },
            accessToken: accessToken,
            message: "Đăng nhập thành công!"
          })
        } else {
          res.status(CODE.ERROR).json({ message: "Đăng nhập thất bại!" })
        }
      }
    }
  } catch (error) {
    throw error
  }
}

const loginByGoogle = async (req, res) => {
  try {
    const { ggToken, ggId } = req.body
    const param = `userinfo?access_token=`
    const response = await axios.get(
      `${ externalAuthUrl.gg }/${ param }${ ggToken }`
    )
    const ggInfo = response.data
    console.log(ggInfo)
    if (response.status === CODE.SUCCESS && ggInfo.sub === ggId) {
      let queryIsExist = `
            SELECT *
               FROM public.user
               WHERE email = '${ ggInfo.email }'
               `
      let isExist = await pool.query(queryIsExist)
      console.log("=======================isExist", isExist)
      if (isExist.rows.length != 0) {
        const accessToken = generatorToken(isExist.rows[0].id, uuidv4())
        res.status(CODE.SUCCESS).json({
          user: {
            id: isExist.rows[0].id,
            name: isExist.rows[0].email,
            thumbnail: isExist.rows[0].thumbnail,
            is_verified: isExist.rows[0].is_verified
          },
          accessToken: accessToken,
          message: "Đăng nhập thành công!"
        })
      } else {
        const queryNewUser = `
                INSERT INTO public."user" (firstName, lastName, thumbnail, email,login ,is_verified)
                VALUES ( '${ ggInfo.family_name }','${ ggInfo.given_name }', '${ ggInfo.picture }','${ ggInfo.email }','true','${ ggInfo.email_verified }')
                RETURNING *
                `
        const result = await pool.query(queryNewUser)
        if (result) {
          const accessToken = generatorToken(result.id, uuidv4())
          res.status(CODE.SUCCESS).json({
            user: {
              id: result.rows[0].id,
              name: result.rows[0].email,
              thumbnail: result.rows[0].thumbnail,
              is_verified: result.rows[0].is_verified
            },
            accessToken: accessToken,
            message: "Đăng nhập thành công!"
          })
        } else {
          res.json({
            code: CODE.ERROR,
            message: "Đăng nhập thất bại!"
          })
        }
      }
    }
  } catch (error) {
    throw error
  }
}
const restPassword = async (req, res) => {
  try {
    const { email, password, secret_code } = req.body
    const hashPassword = bcrypt.hashSync(password, 8)
    const queryUpdate = `
            UPDATE public."user"
            SET password = '${ hashPassword }'
            WHERE email = '${ email }' AND secret_code = '${ secret_code }'
            RETURNING *
            `
    const result = await pool.query(queryUpdate)
    if (result.rows.length != 0) {
      res.json({
        code: CODE.SUCCESS,
        message: "Đổi mật khẩu thành công!"
      })
    } else {
      res.json({
        code: CODE.ERROR,
        message: "Đổi mật khẩu không thành công!"
      })
    }
  } catch (error) {
    throw error
  }
}
const genSecretCode = async (req, res) => {
  try {
    const { email } = req.query

    let queryIsExist = `
    SELECT *
    FROM public."user"
    WHERE email =  '${ email }'
    `
    const result = await pool.query(queryIsExist)

    var mailOptions = {
      from: "topdup.org@gmail.com",
      to: result.rows[0].email,
      subject: "Mã số bí mật",
      text: `Please use the following link within the next 10 minutes to activate your account on xxx APP: ${ result.rows[0].secret_code }`
    }
    await transporter.sendMail(mailOptions)
    res.json({
      code: CODE.SUCCESS,
      message: "Gửi email thành công!"
    })
  } catch (error) { }
}




export default {
  confirmEmail,
  register,
  loginNormal,
  logout,
  loginByFaceBook,
  loginByGoogle,
  restPassword,
  genSecretCode
}
