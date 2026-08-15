const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({

    teamName: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    budget: {
        type: Number,
        required: true,
        trim: true,
        min: 1
    },
    budgetUsed: {
        type: Number,
        trim: true,
        default: 0
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        trim: true,
        required: true
    }

}, {
    timestamps: true
})

const teamModel = mongoose.model("Team", teamSchema);

module.exports = teamModel;