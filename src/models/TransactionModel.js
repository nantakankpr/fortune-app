const DBHelper = require('../services/ormService');

class TransactionModel {
    /**
     * อัพเดท transaction
     */
    static async updateTransaction(transactionId, updateData) {
        try { 
            const result = await DBHelper.update('transactions', updateData, {
                transaction_id: transactionId
            });
            return result;
        } catch (error) {
            console.error('❌ Error updating transaction:', error);
            throw error;
        }
    }

    /**
     * ดึงข้อมูล transaction ตาม ID และ user
     */
    static async getTransactionById(transactionId, userId) {
        try {
 
            const query = `
                SELECT * FROM transactions 
                WHERE transaction_id = ? AND user_id = ?
                LIMIT 1
            `;
            
            const result = await DBHelper.query(query, [transactionId, userId]);
            return result;
        } catch (error) {
            console.error('❌ Error getting transaction:', error);
            throw error;
        }
    }

    /**
     * สร้าง transaction ใหม่
     */
    static async createTransaction(transactionData) {
        try {
            // ทำความสะอาดข้อมูล
            const cleanData = {
                transaction_id: transactionData.transaction_id,
                user_id: transactionData.user_id,
                package_id: transactionData.package_id || null,
                amount: transactionData.amount ? parseFloat(transactionData.amount) : 0,
                recipient_name: transactionData.recipient_name || null,
                recipient_mobile: transactionData.recipient_mobile || null,
                status: transactionData.status || 'pending',
                transaction_type: transactionData.transaction_type || 'payment',
                created_at: transactionData.created_at || new Date(),
                updated_at: transactionData.updated_at || new Date()
            };
            const result = await DBHelper.insert('transactions', cleanData);
            return result;
        } catch (error) {
            console.error('❌ Error creating transaction:', error);
            throw error;
        }
    }
}

module.exports = TransactionModel;