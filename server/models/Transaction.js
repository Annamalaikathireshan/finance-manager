const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
    description: String,
    amount: Number,
    type: { type: String, enum: ['income', 'expense'] },
    date: { type: Date, default: Date.now },
    _user: { type: Schema.Types.ObjectId, ref: 'User' }
});

mongoose.model('transactions', transactionSchema);
