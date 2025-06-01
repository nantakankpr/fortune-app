const {DBHelper} = require('../services/ormService');

class TransactionModel {
    static async getTransactionById(transactionId, userId) {

        const transactionQuery = `SELECT 
                                        t.*,
                                        p.name as package_name,
                                        p.display_name as package_display_name,
                                        p.price as package_price,
                                        p.duration_days as package_duration
                                    FROM transactions t
                                    INNER JOIN packages p ON t.package_id = p.id
                                    WHERE t.transaction_id = ? AND t.user_id = ?
                                    `;

        return await DBHelper.query(transactionQuery, [transactionId, userId]);
    }

}

module.exports = TransactionModel;