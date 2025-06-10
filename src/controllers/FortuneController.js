const DailyFortuneModel = require('../models/DailyFortuneModel');
const { DailyFortuneJob } = require('../jobs');
const DBHelper = require('../services/ormService');

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

    /**
     * แสดงหน้าทดสอบ daily fortune
     */
    static async showTestPage(req, res) {
        try {
            // ดึงสมาชิกทั้งหมด
            const users = await DBHelper.query(`
                SELECT 
                    u.id,
                    u.line_user_id,
                    u.line_name,
                    u.full_name,
                    s.is_active,
                    s.end_date,
                    s.package_name
                FROM users u
                LEFT JOIN subscriptions s ON u.line_user_id = s.user_id AND s.is_active = 1
            `);



            return res.render('admin/fortune-test', {
                title: 'ทดสอบ Daily Fortune',
                users: users,
                admin: req.session.userData || null
            });
        } catch (error) {
            console.error('Show test page error:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load test page'
            });
        }
    }

    /**
     * สร้าง fortune สำหรับ user ที่เลือก
     */
    static async createFortuneForUser(req, res) {
        try {
            const { user_id, content, fortune_date } = req.body; // user_id ตรงนี้จะเป็น line_user_id

            if (!user_id || !content || !fortune_date) {
                return res.status(400).json({
                    success: false,
                    error: 'ข้อมูลไม่ครบถ้วน'
                });
            }

            // ตรวจสอบว่ามี fortune วันนี้แล้วหรือไม่
            const existingFortune = await DailyFortuneModel.getDailyFortune(user_id, fortune_date);
            
            if (existingFortune) {
                return res.json({
                    success: false,
                    error: 'มี fortune วันนี้แล้ว'
                });
            }

            const fortuneData = {
                user_id: user_id, // ใช้ user ID ตรงๆ
                fortune_date: fortune_date,
                category: 'ทั่วไป',
                zodiac: null,
                content: content,
                created_at: new Date()
            };

            await DailyFortuneModel.createDailyFortune(fortuneData);
            
            res.json({
                success: true,
                message: 'สร้าง fortune สำเร็จ',
                data: fortuneData
            });
        } catch (error) {
            console.error('Create fortune error:', error);
            res.status(500).json({
                success: false,
                error: 'เกิดข้อผิดพลาดในการสร้าง fortune'
            });
        }
    }

    /**
     * ดึงข้อมูล fortune ของ user ในวันที่กำหนด
     */
    static async getUserFortune(req, res) {
        try {
            const { user_id, fortune_date } = req.query;

            if (!user_id || !fortune_date) {
                return res.status(400).json({
                    success: false,
                    error: 'ข้อมูลไม่ครบถ้วน'
                });
            }

            const fortune = await DailyFortuneModel.getDailyFortune(user_id, fortune_date);

            res.json({
                success: true,
                data: fortune
            });
        } catch (error) {
            console.error('Get user fortune error:', error);
            res.status(500).json({
                success: false,
                error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
            });
        }
    }
}

module.exports = FortuneController;