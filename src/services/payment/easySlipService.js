const axios = require('axios');
const config = require('../../config/config');

class EasySlipService {
    static async verifyPayment(transactionData) {
        try {
            // Create payload string - this would need to be the actual slip payload
            // You'll need to determine how to get the slip payload from your transaction data
            const payload = transactionData.slip_payload || transactionData.payload;

            if (!payload) {
                return {
                    success: false,
                    verified: false,
                    error: 'No slip payload provided'
                };
            }

            const { data } = await axios.post(
                'https://developer.easyslip.com/api/v1/verify',
                {
                    image: payload,
                },
                {
                    headers: {
                        Authorization: `Bearer ${config.EASYSLIP_API_KEY}`,
                    },
                },
            )
            // Check if API call was successful and data exists
            if (data.status === 200 && data.data) {
                const slipData = data.data;
                return {
                    success: true,
                    verified: true,
                    data: slipData
                };
            } else {
                return {
                    success: false,
                    verified: false,
                    error: 'Invalid slip or API error',
                    data: data
                };
            }

        } catch (error) {
            console.error('EasySlip API error:', error);
            return {
                success: false,
                verified: false,
                error: error.message
            };
        }
    }
}

module.exports = { EasySlipService };