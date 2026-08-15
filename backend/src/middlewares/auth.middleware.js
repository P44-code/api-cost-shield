const jwt = require("jsonwebtoken");


function protect(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: "unauthorized"
        })
    }


    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);


        req.user = decodedToken;

        next();
    } catch (error) {

        return res.status(401).json({
            message: "unauthorized"
        })
    }

}
module.exports = protect;