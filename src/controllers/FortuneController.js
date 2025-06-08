const DailyFortuneModel = require('../models/DailyFortuneModel');
const { DailyFortuneJob } = require('../jobs');

class FortuneController {
    /**
     * ทดสอบส่งข้อความ fortune
     */
    static async testBroadcast(req, res) {
        try {
            const result = await DailyFortuneJob.sendDailyFortuneMessages();
            
            res.json({
                success: true,
                message: 'Daily fortune broadcast completed',
                result: result
            });
        } catch (error) {
            console.error('Test broadcast error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send daily fortune messages'
            });
        }
    }

    /**
     * สร้าง sample fortune data
     */
    static async createSampleFortune(req, res) {
        try {
            const { user_id } = req.body;
            const today = new Date().toISOString().split('T')[0];
            
            const fortuneData = {
                user_id: user_id,
                fortune_date: today,
                category: 'การงาน',
                zodiac: 'ราศีกันย์',
                content: 'วันนี้เป็นวันที่ดีสำหรับการเริ่มต้นสิ่งใหม่ๆ ดวงการงานเข้าทำนองดี มีโอกาสได้รับข่าวดีในเรื่องเงินทอง ควรระวังเรื่องสุขภาพและพักผ่อนให้เพียงพอ',
                created_at: new Date()
            };

            const result = await DailyFortuneModel.createDailyFortune(fortuneData);
            
            res.json({
                success: true,
                message: 'Sample fortune created',
                data: fortuneData
            });
        } catch (error) {
            console.error('Create sample fortune error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create sample fortune'
            });
        }
    }
}

module.exports = FortuneController;