import { CODE, ID } from "../constants/index";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { secretKey, externalAuthUrl , hostName} from "../configs/index"
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
import transporter from "./utils/nodemailer"
const Pool = require("pg").Pool;
const pool = new Pool({
    user: 'admin',
    host: '3.1.100.54',
    database: 'topdup_db',
    password: 'uyL7WgydqKNkNMWe',
    port: '5432'
});
const generatorToken = (userId, baseToken) => {
    return jwt.sign(
        {
            id: userId,
            baseToken
        },
        secretKey
    );
};

const confirmEmail = async (req,res)=>{
    try {
    const {userId , code} = req.param;
    console.log(userId, code )  
    } catch (error) {
        throw error
    }
}

const register = async (req, res) => {
    try {
        const { email , password, firstName , lastName } = req.body;
        let queryIsExist = `
        SELECT *
        FROM public."user"
        WHERE email =  '${email}'
        `;
        let isExist = await pool.query(queryIsExist);
        if (isExist.rows.length!=0) {
            res.json({
                code: CODE.OBJECT_EXIST,
                message: "Tài khoản đã tồn tại!"
            })
        }
        else {
            const hashPassword = bcrypt.hashSync(password, 8);  
            const queryNewUser = `
            INSERT INTO public."user" (firstName, lastName, email, password,login)
            VALUES ('${firstName}',' ${lastName}','${email}', '${hashPassword}', 'true')
            RETURNING id,email,thumbnail;
          `;

            const result =  await pool.query(queryNewUser)
            const secretCode = uuidv4()
            var mailOptions = {
                from: 'xxx@gmail.com',
                to: result.rows[0].email,
                subject: 'Sending Email using Node.js',
                       text: `Please use the following link within the next 10 minutes to activate your account on xxx APP: ${hostName}/api/auth/verification/verify-account/${result.rows[0].id}/${secretCode}`,
                html: `<p>Please use the following link within the next 10 minutes to activate your account on xxx APP: <strong><a href="${hostName}/api/auth/verification/verify-account/${result.rows[0].id}/${secretCode}" target="_blank">Email bestätigen</a></strong></p>`,
              };
            await transporter.sendMail(mailOptions)
            if (result) {
                res.json(
                    {
                        code: CODE.SUCCESS,
                        data: {
                            id: result.rows[0].id,
                            name: result.rows[0].email,
                            verify: false
                        }
                    }
                )
            }
            else {
                res.json({
                    code: CODE.ERROR,
                    message: "Đăng ký thất bại!"
                })
            }
        }
    } catch (error) {
        throw error

    }
}

const loginNormal = async (req, res) => {
    try {
    const { email, password } = req.body;
    const query = `
    SELECT * 
    FROM public."user" 
    WHERE email = '${email}'
    `;
     let user = await pool.query(query)
        if(user){
            const compare = bcrypt.compareSync(password, user.password)
            if (compare) {
                const accessToken = generatorToken(user._id, uuidv4())
                res.json({
                    code: CODE.SUCCESS,
                    data: {
                        user: {
                            id: user.id,
                            name: user.name,
                            thumbnail: user.thumbnail
                        },
                        accessToken: accessToken
                    },
                    message: "Đăng nhập thành công!"

                })
            }
            else {
                res.json({
                    code: CODE.INVALID,
                    message: "Mật khẩu không đúng!"

                })
            }
        }
        else {
            res.json({
                code: CODE.INVALID,
                message: "Tài khoản không đúng!"

            })
        }
    } catch (error) {
        throw error
    }
}

const logout = async (req, res) => {
    try {
        res.json(
            {
                code: CODE.SUCCESS, 
                message: "Đăng xuất thành công!"
            }
        )
    } catch (error) {
        throw error
    }
}

const loginByFaceBook = async (req, res) => {
    try {
        const { fbToken, fbId } = req.body;
        const param = `me?fields=id,name,email,picture{height,cache_key,is_silhouette,url,width},gender`
        const response = await axios.get(
            `${externalAuthUrl.fb}/${param}&access_token=${fbToken}`
        )
        const fbInfo = response.data;
        if (response.status === 200 && fbInfo.id === fbId) {
            let queryIsExist = `
             SELECT *
                FROM public."user"
                WHERE email = '${fbInfo.email}'
                `;
            let isExist = await pool.query(queryIsExist);
            if (isExist.rows.length!=0) {
                const queryUpdate = `
                UPDATE public."user" 
                SET email = '${fbInfo.email}', thumbnail = '${fbInfo.picture.data.url}'
                WHERE id = '${isExist.rows[0].id}'
                RETURNING id,email,thumbnail;
                `
               const result =  await pool.query(queryUpdate)
                const accessToken = generatorToken(result.rows[0].id, uuidv4())
                res.json({
                    code: CODE.SUCCESS,
                    data: {
                        user: {
                            id: result.rows[0].id,
                            name: result.rows[0].email,
                            thumbnail: result.rows[0].thumbnail
                        },
                        accessToken: accessToken
                    },
                    message: "Đăng nhập thành công!"

                })
            }
            else {
            const queryNewUser = `
            INSERT INTO public."user" (firstName, lastName, thumbnail, email,login ,password)
            VALUES ('testfb','testfb', '${fbInfo.picture.data.url}','${fbInfo.email}','true','testpassword')
            RETURNING id,email,thumbnail;
            `;
            const result = await  pool.query(queryNewUser)
                if(result){
                    const accessToken = generatorToken(result.id, uuidv4())
                    res.json({
                    code: CODE.SUCCESS,
                    data: {
                        user: {
                            id: result.rows[0].id,
                            name: result.rows[0].email,
                            verify: false
                        },
                        accessToken: accessToken
                    },
                    message: "Đăng nhập thành công!"

                })
                }
                else{
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

const loginByGoogle = async (req, res) => {
    try {
        const { ggToken, ggId } = req.body;
        const param = `userinfo?access_token=`;
        const response = await axios.get(
            `${externalAuthUrl.gg}/${param}${ggToken}`
        )
        const ggInfo = response.data;

        if (response.status === 200 && ggInfo.sub === ggId) {
                // name: ggInfo.name,
                // thumbnail: ggInfo.picture,
                // email: ggInfo.email,
                // verify: ggInfo.email_verified,
                // sociation: "google"
            let queryIsExist = `
            SELECT *
               FROM public."user"
               WHERE email = ${ggInfo.email}
               `;
           let isExist = await pool.query(queryIsExist);
            if (isExist.rows.length!=0) {
                const queryUpdate = `
                UPDATE public."user" 
                SET  email = '${ggInfo.email}', thumnail = '${ggInfo.picture}'
                WHERE id = '${isExist.id}'
                RETURNING id,email,thumbnail;
              `;
               const result =  await pool.query(queryUpdate)
                const accessToken = generatorToken(result.rows[0].id, uuidv4())
                res.json({
                    code: CODE.SUCCESS,
                    data: {
                        user: {
                            id: result.rows[0].id,
                            name: result.rows[0].email,
                            thumbnail: result.rows[0].thumbnail
                        },
                        accessToken: accessToken
                    },
                    message: "Đăng nhập thành công!"

                })
            }
            else {
                const queryNewUser = `
                INSERT INTO public."user" (firstName, lastName,, thumbnail, email,login ,password)
                VALUES ('testgg','testgg', ${ggInfo.name}, ${ggInfo.picture},${ggInfo.email},'true','testpassword')
                RETURNING id,email,thumbnail;
                `;
                const result = await  pool.query(queryNewUser)
               if(result){
                const accessToken = generatorToken(result.id, uuidv4())
                res.json({
                    code: CODE.SUCCESS,
                    data: {
                        user: {
                            id: result.id,
                            name: result.name,
                            thumbnail: result.thumbnail
                        },
                        accessToken: accessToken
                    },
                    message: "Đăng nhập thành công!"

                })
               }
               else{
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

export default {
    confirmEmail,
    register,
    loginNormal,
    logout,
    loginByFaceBook,
    loginByGoogle
}

