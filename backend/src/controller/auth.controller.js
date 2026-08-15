const userModel = require("../models/model")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")


async function registerUser(req, res) {

    try {


        const { username, email, password } = req.body;



        if (!username || !email || !password) {
            return res.status(400).json({
                message: "all feilds are required"
            })
        }

        const isUserExist = await userModel.findOne({

            $or: [
                { username },
                { email }

            ]
        })

        if (isUserExist) {
            return res.status(400).json({
                message: "user already exists"
            })
        }



        const hash = await bcrypt.hash(String(password), 10);

        const user = await userModel.create({
            username,
            email,
            password: hash
        })

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        res.cookie("token", token, { httpOnly: true });

        res.status(201).json({
            message: "user created successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            }
        })



    } catch (err) {
        res.status(500).json({
            message: "internal server error",
            error: err.message
        })
    }


}

async function loginUser(req, res) {
    try {

        const { username, email, password } = req.body;

        if (!password || (!username && !email)) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const user = await userModel.findOne({
            $or: [
                { username },
                { email }
            ]
        })

        if (!user) {
            return res.status(404).json({
                message: "user not found"
            })
        }

        const isPasswordValid = await bcrypt.compare(String(password), user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "incorrect password"
            })
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        res.cookie("token", token, { httpOnly: true })

        res.status(200).json({
            message: "user logged in successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            }
        })

    } catch (error) {
        res.status(500).json({
            message: "internal server error"
        })
    }
}

function logoutUser(req, res) {
    try {
        res.clearCookie("token");
        res.status(200).json({
            message: "Logged out successfully"
        });
    } catch (err) {
        return res.status(500).json({
            message: "internal server error",
            error: err.message
        })
    }

}

module.exports = { registerUser, loginUser, logoutUser }