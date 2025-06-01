const cron = require('node-cron');
const SubscriptionJob = require('./subscriptionJob');

class CronScheduler {
    static jobs = new Map();

    /**
     * เริ่มต้น cron jobs ทั้งหมด
     */
    static initializeJobs() {
        console.log('🕒 Initializing cron jobs...');

        // ปิด subscription ที่หมดอายุทุก 1 ชั่วโมง
        this.scheduleJob('subscription-cleanup', '0 * * * *', async () => {
            await SubscriptionJob.deactivateExpiredSubscriptions();
        });

        // ทำความสะอาด expired cache ทุก 30 นาที
        this.scheduleJob('cache-cleanup', '*/30 * * * *', () => {
            SubscriptionJob.cleanExpiredCache();
        });

        console.log(`✅ Initialized ${this.jobs.size} cron jobs`);
    }

    /**
     * สร้าง cron job ใหม่
     */
    static scheduleJob(name, cronPattern, jobFunction) {
        try {
            const task = cron.schedule(cronPattern, jobFunction, {
                scheduled: true,
                timezone: 'Asia/Bangkok'
            });

            this.jobs.set(name, {
                task: task,
                pattern: cronPattern,
                name: name,
                isRunning: task.running || false
            });

            console.log(`📅 Scheduled job '${name}' with pattern: ${cronPattern}`);
            return task;
        } catch (error) {
            console.error(`❌ Failed to schedule job '${name}':`, error);
            throw error;
        }
    }

    /**
     * หยุด cron job
     */
    static stopJob(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.task.stop();
            console.log(`⏹️  Stopped job '${name}'`);
            return true;
        }
        console.warn(`⚠️  Job '${name}' not found`);
        return false;
    }

    /**
     * เริ่ม cron job ที่หยุดไว้
     */
    static startJob(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.task.start();
            console.log(`▶️  Started job '${name}'`);
            return true;
        }
        console.warn(`⚠️  Job '${name}' not found`);
        return false;
    }

    /**
     * รัน job ทันที (manual trigger)
     */
    static async runJobNow(name) {
        const job = this.jobs.get(name);
        if (job) {
            console.log(`🚀 Manually triggering job '${name}'`);
            try {
                if (name === 'subscription-cleanup') {
                    await SubscriptionJob.deactivateExpiredSubscriptions();
                } else if (name === 'cache-cleanup') {
                    SubscriptionJob.cleanExpiredCache();
                }
                console.log(`✅ Job '${name}' completed successfully`);
                return true;
            } catch (error) {
                console.error(`❌ Job '${name}' failed:`, error);
                throw error;
            }
        }
        console.warn(`⚠️  Job '${name}' not found`);
        return false;
    }

    /**
     * ดูสถานะ jobs ทั้งหมด
     */
    static getJobsStatus() {
        const status = {};
        
        for (const [name, job] of this.jobs.entries()) {
            status[name] = {
                name: job.name,
                pattern: job.pattern,
                isRunning: job.task.running || false
            };
        }

        return status;
    }

    /**
     * หยุด jobs ทั้งหมด
     */
    static stopAllJobs() {
        console.log('🛑 Stopping all cron jobs...');
        
        for (const [name, job] of this.jobs.entries()) {
            job.task.stop();
        }
        
        console.log(`✅ Stopped ${this.jobs.size} cron jobs`);
    }

    /**
     * เริ่ม jobs ทั้งหมด
     */
    static startAllJobs() {
        console.log('▶️  Starting all cron jobs...');
        
        for (const [name, job] of this.jobs.entries()) {
            job.task.start();
        }
        
        console.log(`✅ Started ${this.jobs.size} cron jobs`);
    }
}

module.exports = CronScheduler;