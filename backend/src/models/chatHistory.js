const mongoose = require("mongoose");

const chatHistorySchema = new mongoose.Schema({
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    sessionId: {
        type: String,
    },
    tokensUsed: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

module.exports = mongoose.model("ChatHistory", chatHistorySchema);