const mongoose = require('mongoose');
const User = require("../../models/userSchema");


const getWallet = async (req,res) => {

    try {

        const userId = req.user ? req.user._id : null;        
        if(!userId){
            return res.status(401).send("unautherised");
        }

        const user = await User.findById(userId);
        console.log("object",user);

        
        res.render("wallet", { userId });
    } catch (error) {
        
    }
}


const getWalletBalance = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ balance: user.wallet.balance });
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const addMoneyToWallet = async (req, res) => {
    try {
        const { userId, amount } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.wallet.balance += parsedAmount;
        user.wallet.transactions.push({
            type: 'credit',
            amount: parsedAmount,
            description: 'Money added to wallet',
            date: new Date(),
        });

        await user.save();

        res.json({
            balance: user.wallet.balance,
            transactions: user.wallet.transactions.slice(-5).reverse(),
        });
    } catch (error) {
        console.error('Error adding money to wallet:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};





module.exports = {
    getWallet,
    getWalletBalance,
    addMoneyToWallet,

}