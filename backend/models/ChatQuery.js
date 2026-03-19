const mongoose = require('mongoose');

const ChatQuerySchema = new mongoose.Schema(
    {
        query: { type: String, required: true },
        response: { type: String, required: true },
        context: { type: String, default: '' },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', null: true },
        feedback: { type: String, enum: ['helpful', 'not_helpful', 'neutral'], default: 'neutral' }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ChatQuery', ChatQuerySchema);
