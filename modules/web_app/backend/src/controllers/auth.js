import { CODE, ID } from "../constants/index";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { secretKey, fbUrl, GgUrl } from "../configs/index"
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
const Pool = require("pg").Pool;
const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'topdup_db',
    password: 'admin',
    port: 5432
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

const register = async (req, res) => {
    try {
        const { email , password, firstName , lastName } = req.body;
        let queryisExist = `
        SELECT *
        FROM public."user"
        WHERE email = ${email}
        `;
        let isExist = await pool.query(queryisExist);
        if (isExist) {
            res.json({
                code: CODE.OBJECT_EXIST,
                message: "Tài khoản đã tồn tại!"
            })
        }
        else {
            const hashPassword = bcrypt.hashSync(password, 8);  
            const queryNewUser = `
            INSERT INTO public."user" (firstName, lastName, email, password)
            VALUES (${firstName}, ${lastName},${email}, ${hashPassword})
          `;
            const result = pool.query(queryNewUser)
            if (result) {
                res.json(
                    {
                        code: CODE.SUCCESS,
                        data: {
                            id: result.id,
                            name: result.name,
                            verify: newUser.verify
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

        // get user by userName/email
    // query    let user  = 
    const query = `
    SELECT * 
    FROM public."user" 
    WHERE email = ${email}
    `;
     let user = await pool.query(query)
        //
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

const loginFaceBook = async (req, res) => {
    try {
        const { fbToken, fbId } = req.body;
        const param = `me?fields=id,name,email,picture{height,cache_key,is_silhouette,url,width},gender`
        const response = await axios.get(
            `${fbUrl}/${param}&access_token=${fbToken}`
        )
        const fbInfo = response.data;
        if (response.status === 200 && fbInfo.id === fbId) {
            let queryisExist = `
             SELECT *
                FROM public."user"
                WHERE email = ${fbInfo.email}
                `;
            let isExist = await pool.query(queryisExist);

            if (isExist) {
                const queryUpdate = `
                UPDATE public."user" 
                SET name = ${fbInfo.name}, email = ${fbInfo.email}, thumbnail = ${fbInfo.picture.data.url}
                WHERE id = ${isExist.id}
              `;
               const user =  await pool.query(queryUpdate)
                const accessToken = generatorToken(user._id, data)
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
            const queryNewUser = `
            INSERT INTO public."user" (name, thumbnail, email)
            VALUES (${fbInfo.name}, ${fbInfo.picture.data.url},${fbInfo.email})
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

const loginGoogle = async (req, res) => {
    try {
        const { ggToken, ggId, deviceName } = req.body;
        const param = `userinfo?access_token=`;
        const response = await axios.get(
            `${GgUrl}/${param}${ggToken}`
        )
        const ggInfo = response.data;

        if (response.status === 200 && ggInfo.sub === ggId) {
                // name: ggInfo.name,
                // thumbnail: ggInfo.picture,
                // email: ggInfo.email,
                // verify: ggInfo.email_verified,
                // sociation: "google"
            let queryisExist = `
            SELECT *
               FROM public."user"
               WHERE email = ${ggInfo.email}
               `;
           let isExist = await pool.query(queryisExist);
            if (isExist) {
                const queryUpdate = `
                UPDATE public."user" 
                SET name = ${ggInfo.name}, email = ${ggInfo.email}, thumnail = ${ggInfo.picture}
                WHERE id = ${isExist.id}
              `;
               const user =  await pool.query(queryUpdate)
                const accessToken = generatorToken(user.id, uuidv4())
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
                const queryNewUser = `
                INSERT INTO public."user" (name, thumbnail, email)
                VALUES (${ggInfo.name}, ${ggInfo.picture},${ggInfo.email})
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
    register,
    loginNormal,
    logout,
    loginFaceBook,
    loginGoogle
}

