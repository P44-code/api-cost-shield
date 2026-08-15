const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({

    username: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    hasTeam: {
        type: Boolean,
        default: false,
    },

    password: {
        type: String,
        required: true,
        minlength: 6,
        trim: true
    }
}, {
    timestamps: true
})

const userModel = mongoose.model("User", userSchema);

module.exports = userModel;