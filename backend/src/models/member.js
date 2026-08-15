const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ["admin", "developer", "viewer"],
        default: "developer",
    },
}, { timestamps: true });

const memberModel = mongoose.model("Member", memberSchema);
module.exports = memberModel;