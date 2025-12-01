const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');

const Transaction = mongoose.model('transactions');

module.exports = app => {
    app.get('/api/budget', requireLogin, async (req, res) => {
        const transactions = await Transaction.find({ _user: req.user.id });
        res.send(transactions);
    });

    app.post('/api/budget', requireLogin, async (req, res) => {
        const { description, amount, type } = req.body;

        const transaction = new Transaction({
            description,
            amount,
            type,
            _user: req.user.id,
            date: Date.now()
        });

        try {
            await transaction.save();
            res.send(transaction);
        } catch (err) {
            res.status(422).send(err);
        }
    });

    app.delete('/api/budget/:id', requireLogin, async (req, res) => {
        try {
            await Transaction.deleteOne({ _id: req.params.id, _user: req.user.id });
            res.send({});
        } catch (err) {
            res.status(422).send(err);
        }
    });
};
