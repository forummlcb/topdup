import { CODE, ID } from "../constants/index";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { secretKey, fbUrl, GgUrl } from "../configs/index"
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
const generatorToken = (userId, baseToken) => {
    console.log(baseToken);
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
        const { phoneNumber, password, name } = req.body;
        let user
        // check existed

        //
        if (user) {
            res.json({
                code: CODE.OBJECT_EXIST,
                message: "Tài khoản đã tồn tại!"
            })
        }
        else {
            const hashPassword = bcrypt.hashSync(password, 8);    
            let   newUser = new User({
                    phone: phoneNumber,
                    password: hashPassword,
                    name: name,
                })
            // save new user
            const result =  true 

            //
            if (result) {
                res.json(
                    {
                        code: CODE.SUCCESS,
                        data: {
                            // _id: result._id,
                            // name: result.name,
                            // verify: newUser.verify
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
        const { userText, password, deviceName } = req.body;

        // get user by userName/email
// query    let user  = 
        let user = true
        //
        if(user){
            const compare = bcrypt.compareSync(password, user.password)
            if (compare) {
                const deviceData = {
                    name: deviceName,
                    user: user._id,
                    baseToken: uuidv4(),
                }
                const accessToken = generatorToken(user._id, data)
                res.json({
                    code: CODE.SUCCESS,
                    data: {
                        user: {
                            _id: user._id,
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
        // throw error
        res.json({
            code: CODE.EXCEPTION_ERROR,
            data: error,
            message: "Đăng nhập thất bại!"
        })
    }
}

const logout = async (req, res) => {
    try {
        const { userId, deviceName } = req.body;
        let result = await Device.findOneAndRemove({
            $and: [
                { user: userId },
                { name: deviceName }
            ]
        })
        console.log(result)
        if (result) {
            res.json(
                {
                    code: CODE.SUCCESS,
                    message: "Đăng xuất thành công!"
                });
        }
        else {
            res.json({ code: CODE.ERROR, message: "Đăng xuất thất bại!" });
        }
    } catch (error) {
        // throw error
        console.log(error)
        res.json({
            code: CODE.EXCEPTION_ERROR,
            data: error,
            message: "Đăng xuất thất bại!"
        })
    }
}


const handleLoginWithDevice = async (user, deviceData) => {
    try {
        let deviceExist = await Device.findOne({
            user: user._id,
            name: deviceData.name
        })
        if (deviceExist) {
            let device = await Device.findOneAndUpdate({
                $and: [
                    { user: user._id },
                    { name: deviceData.name }
                ]
            },
                deviceData,
                {
                    new: true
                }
            )
            console.log("update Device")
            return device.baseToken
        }
        else {
            let newDevice = new Device(deviceData);
            await newDevice.save()
            console.log("create Device")
            return newDevice.baseToken
        }

    } catch (error) {
        throw error

    }
}

const loginFaceBook = async (req, res) => {
    try {
        const { fbToken, fbId, deviceName } = req.body;
        const param = `me?fields=id,name,email,picture{height,cache_key,is_silhouette,url,width},gender`
        const response = await axios.get(
            `${fbUrl}/${param}&access_token=${fbToken}`
        )
        const fbInfo = response.data;
        if (response.status === 200 && fbInfo.id === fbId) {
            let gender = 0;
            if (fbInfo.gender == "male") {
                gender = 1;
            }
            const userData = {
                name: fbInfo.name,
                thumbnail: fbInfo.picture.data.url,
                gender: gender,
                email: fbInfo.email,
                sociation: "facebook"
            }

            const userExist = await User.findOne(
                {
                    email: fbInfo.email
                }
            )
            if (userExist) {
                const user = await User.findOneAndUpdate(
                    {
                        email: fbInfo.email
                    },
                    userData,
                    { new: true }
                )
                const deviceData = {
                    name: deviceName,
                    user: user._id,
                    baseToken: uuidv4(),
                }
                const data = await handleLoginWithDevice(user, deviceData)
                const accessToken = generatorToken(user._id, data)
                res.json({
                    code: CODE.SUCCESS,
                    data: {
                        user: {
                            _id: user._id,
                            name: user.name,
                            thumbnail: user.thumbnail
                        },
                        accessToken: accessToken
                    },
                    message: "Đăng nhập thành công!"

                })
            }
            else {
                const newUser = new User(userData);
                const user = await newUser.save();
                const deviceData = {
                    name: deviceName,
                    user: user._id,
                    baseToken: uuidv4(),
                }
                const data = await handleLoginWithDevice(user, deviceData)
                const accessToken = generatorToken(user._id, data)
                res.json({
                    code: CODE.SUCCESS,
                    data: {
                        user: {
                            _id: user._id,
                            name: user.name,
                            thumbnail: user.thumbnail
                        },
                        accessToken: accessToken
                    },
                    message: "Đăng nhập thành công!"

                })
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
            console.log(ggInfo)
            const userData = {
                name: ggInfo.name,
                thumbnail: ggInfo.picture,
                email: ggInfo.email,
                verify: ggInfo.email_verified,
                sociation: "google"
            }
            const userExist = await User.findOne(
                {
                    email: ggInfo.email
                }
            )
            if (userExist) {
                const user = await User.findOneAndUpdate(
                    {
                        email: ggInfo.email
                    },
                    userData,
                    { new: true }
                )
                const deviceData = {
                    name: deviceName,
                    user: user._id,
                    baseToken: uuidv4(),
                }
                const data = await handleLoginWithDevice(user, deviceData)
                const accessToken = generatorToken(user._id, data)
                res.json({
                    code: CODE.SUCCESS,
                    data: {
                        user: {
                            _id: user._id,
                            name: user.name,
                            thumbnail: user.thumbnail
                        },
                        accessToken: accessToken
                    },
                    message: "Đăng nhập thành công!"

                })
            }
            else {
                const newUser = new User(userData);
                const user = await newUser.save();
                const deviceData = {
                    name: deviceName,
                    user: user._id,
                    baseToken: uuidv4(),
                }
                const data = await handleLoginWithDevice(user, deviceData)
                const accessToken = generatorToken(user._id, data)
                res.json({
                    code: CODE.SUCCESS,
                    data: {
                        user: {
                            _id: user._id,
                            name: user.name,
                            thumbnail: user.thumbnail
                        },
                        accessToken: accessToken
                    },
                    message: "Đăng nhập thành công!"

                })
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

