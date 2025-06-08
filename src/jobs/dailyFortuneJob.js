const DailyFortuneModel = require('../models/DailyFortuneModel');
const SubscriptionModel = require('../models/SubscriptionModel');
const { client } = require('../services/lineService');

class DailyFortuneJob {
    /**
     * ส่งข้อความ daily fortune ให้ user ทุกคนที่มี subscription active
     */
    static async sendDailyFortuneMessages() {
        try {
            // ตรวจสอบและปิด subscription ที่หมดอายุก่อน
            await this.deactivateExpiredSubscriptions();

            // ดึงรายชื่อ user ที่มี fortune วันนี้และมี subscription active
            const usersWithFortune = await DailyFortuneModel.getUsersWithTodayFortune();

            if (usersWithFortune.length === 0) {
                return { success: true, sent: 0, failed: 0 };
            }

            let sentCount = 0;
            let failedCount = 0;
            const failedUsers = [];

            // ส่งข้อความทีละคน
            for (const user of usersWithFortune) {
                try {
                    await this.sendFortuneMessageWithRetry(user);
                    sentCount++;

                    // หน่วงเวลาแบบ random เพื่อไม่ให้ spam LINE API
                    const randomDelay = this.getRandomDelay();
                    await this.delay(randomDelay);
                } catch (error) {
                    failedCount++;
                    failedUsers.push({
                        user_id: user.user_id,
                        line_name: user.line_name,
                        error: error.message
                    });
                    console.error(`❌ Failed to send fortune to user: ${user.line_name} (${user.user_id})`, error.message);
                }
            }

            if (failedUsers.length > 0) {
                console.log('📝 Failed users:', failedUsers);
            }

            return {
                success: true,
                sent: sentCount,
                failed: failedCount,
                total: usersWithFortune.length,
                failedUsers
            };

        } catch (error) {
            console.error('❌ Daily fortune job failed:', error);
            throw error;
        }
    }

    /**
     * ปิด subscription ที่หมดอายุ
     */
    static async deactivateExpiredSubscriptions() {
        try {
            const result = await SubscriptionModel.deactivateExpiredSubscriptions();
            if (result.affectedRows > 0) {
                console.log(`🔄 Deactivated ${result.affectedRows} expired subscriptions`);
            }
        } catch (error) {
            console.error('❌ Failed to deactivate expired subscriptions:', error);
            // ไม่ throw error เพื่อให้ job ทำงานต่อได้
        }
    }

    /**
     * ส่งข้อความ fortune ให้ user คนหนึ่งพร้อม retry mechanism
     */
    static async sendFortuneMessageWithRetry(user, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.sendFortuneMessage(user);
                return; // สำเร็จแล้วออกจาก loop
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed for user ${user.user_id}: ${error.message}`);

                if (attempt < maxRetries) {
                    // หน่วงเวลาก่อน retry แบบ exponential backoff
                    const delayTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await this.delay(delayTime);
                }
            }
        }

        throw lastError; // ถ้า retry หมดแล้วยังไม่สำเร็จ
    }

    /**
     * ส่งข้อความ fortune ให้ user คนหนึ่ง
     */
    static async sendFortuneMessage(user) {
        try {
            // ตรวจสอบข้อมูล user ก่อนส่ง
            if (!user.user_id) {
                throw new Error('User ID is required');
            }

            const message = this.createFortuneMessage(user);

            // ตรวจสอบความยาวข้อความ (LINE มีขีดจำกัด)
            if (message.text.length > 2000) {
                console.warn(`⚠️ Message too long for user ${user.user_id}, truncating...`);
                message.text = message.text.substring(0, 1950) + '...';
            }

            await client.pushMessage(user.user_id, message);

        } catch (error) {
            console.error(`Failed to send message to user ${user.user_id}:`, error);
            throw error;
        }
    }

    /**
     * สร้างข้อความ fortune
     */
    static createFortuneMessage(user) {
        try {
            const today = new Date().toLocaleDateString('th-TH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Bangkok'
            });

            // ตรวจสอบและทำความสะอาดข้อมูล
            const userName = user.line_name ? user.line_name.trim() : 'ผู้ใช้';
            const categoryText = user.category ? `📂 หมวด: ${user.category.trim()}\n` : '';
            const zodiacText = user.zodiac ? `♈ ราศี: ${user.zodiac.trim()}\n` : '';
            const content = user.content ? user.content.trim() : 'ไม่มีข้อมูลดวงประจำวัน';

            const messageText = `🌅 สวัสดีตอนเช้า คุณ${userName}

📅 ${today}

🔮 ดวงประจำวันของคุณ
${categoryText}${zodiacText}
${content}

✨ ขอให้มีวันที่ดีนะคะ!

---
Fortune App 💫`;

            return {
                type: 'text',
                text: messageText
            };

        } catch (error) {
            console.error('Error creating fortune message:', error);
            // Return fallback message
            return {
                type: 'text',
                text: `🌅 สวัสดีตอนเช้า คุณ${user.line_name || 'ผู้ใช้'}

🔮 ขออภัย เกิดข้อผิดพลาดในการสร้างข้อความดวง

✨ ขอให้มีวันที่ดีนะคะ!

---
Fortune App 💫`
            };
        }
    }

    /**
     * หน่วงเวลา (delay)
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
 * สร้าง random delay เพื่อป้องกัน rate limit
 */
    static getRandomDelay() {
        const delays = [500, 600, 700, 800, 900, 1000];
        const randomIndex = Math.floor(Math.random() * delays.length);
        return delays[randomIndex];
    }
}

module.exports = DailyFortuneJob;