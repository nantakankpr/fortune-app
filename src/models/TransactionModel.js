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

    static async getTransaction(filters = false) {
        let params = {};
        let transactionQueryLimit = ` LIMIT 0,10 `;
        if (filters) {
            const { memberName, status, date,nextlitmit,endlitmit } = filters;
            if (memberName && memberName!='') params.recipient_name = memberName;
            if (status && status!='all') params.status = status;
            if (date && date!='')  params.updated_at = date;
            if (nextlitmit && nextlitmit!='' && endlitmit && endlitmit!=''){
                transactionQueryLimit = ` LIMIT ${nextlitmit},${endlitmit} `;
            }
        }
        const transactionQueryJoin = ` INNER JOIN packages p ON t.package_id = p.id `;
        const transactionQueryOrderBy = ` ORDER BY t.id desc`;
        const transactionQuerySeleted = ` t.*,
                                      p.name as package_name,
                                      p.display_name as package_display_name,
                                      p.price as package_price,
                                      'Promptpay' as channel `;

       const total_record = await DBHelper.selectSql(' count(t.id) as total_record ','transactions t', params);
       const row = await DBHelper.selectSql(transactionQuerySeleted,'transactions t',params,transactionQueryJoin,transactionQueryOrderBy,transactionQueryLimit);
       return {row:row,total_record:total_record[0].total_record}
    }

}

module.exports = TransactionModel;