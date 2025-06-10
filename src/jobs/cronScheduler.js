const cron = require('node-cron');
const DailyFortuneJob = require('./dailyFortuneJob');

class CronScheduler {
    static jobs = new Map();

    /**
     * เริ่มต้น cron jobs ทั้งหมด
     */
    static initializeJobs() {
        console.log('🕒 Initializing cron jobs...');

        // // ส่งข้อความ daily fortune ทุกวันเวลา 8:00 น.
        this.scheduleJob('daily-fortune', '0 8 * * *', async () => {
            await DailyFortuneJob.sendDailyFortuneMessages();
        });

        // ส่งข้อความ daily fortune ทุกวันเวลา 9:20 น.
        // this.scheduleJob('daily-fortune', '57 9 * * *', async () => {
        //     await DailyFortuneJob.sendDailyFortuneMessages();
        // });

        // ส่งข้อความ daily fortune ทุก 1 นาที (testing mode)
        // this.scheduleJob('daily-fortune', '* * * * *', async () => {
        //     console.log('🧪 Running daily fortune in test mode (every minute)');
        //     await DailyFortuneJob.sendDailyFortuneMessages();
        // });

        console.log('✅ Cron jobs initialized successfully');
    }

    /**
     * สร้าง cron job ใหม่
     */
    static scheduleJob(name, cronPattern, jobFunction) {
        try {
            if (this.jobs.has(name)) {
                this.stopJob(name);
            }

            const job = cron.schedule(cronPattern, jobFunction, {
                scheduled: false,
                timezone: 'Asia/Bangkok'
            });

            this.jobs.set(name, {
                job: job,
                pattern: cronPattern,
                function: jobFunction,
                status: 'stopped'
            });

            job.start();
            this.jobs.get(name).status = 'running';

            console.log(`✅ Job "${name}" scheduled with pattern: ${cronPattern}`);
            return job;
        } catch (error) {
            console.error(`❌ Error scheduling job "${name}":`, error);
            throw error;
        }
    }

    /**
     * หยุด cron job
     */
    static stopJob(name) {
        const jobData = this.jobs.get(name);
        if (jobData) {
            jobData.job.stop();
            jobData.status = 'stopped';
            console.log(`🛑 Job "${name}" stopped`);
        } else {
            console.log(`⚠️ Job "${name}" not found`);
        }
    }

    /**
     * เริ่ม cron job ที่หยุดไว้
     */
    static startJob(name) {
        const jobData = this.jobs.get(name);
        if (jobData) {
            jobData.job.start();
            jobData.status = 'running';
            console.log(`▶️ Job "${name}" started`);
        } else {
            console.log(`⚠️ Job "${name}" not found`);
        }
    }

    /**
     * รัน job ทันที (manual trigger)
     */
    static async runJobNow(name) {
        const jobData = this.jobs.get(name);
        if (jobData) {
            console.log(`🏃 Running job "${name}" manually...`);
            try {
                await jobData.function();
                console.log(`✅ Job "${name}" completed successfully`);
            } catch (error) {
                console.error(`❌ Job "${name}" failed:`, error);
                throw error;
            }
        } else {
            console.log(`⚠️ Job "${name}" not found`);
        }
    }

    /**
     * ดูสถานะ jobs ทั้งหมด
     */
    static getJobsStatus() {
        const status = {};
        for (const [name, jobData] of this.jobs.entries()) {
            status[name] = {
                pattern: jobData.pattern,
                status: jobData.status,
                nextRun: jobData.status === 'running' ?
                    'Based on cron pattern' :
                    'Job is stopped'
            };
        }
        return status;
    }

    /**
     * หยุด jobs ทั้งหมด
     */
    static stopAllJobs() {
        console.log('🛑 Stopping all cron jobs...');
        for (const [name, jobData] of this.jobs.entries()) {
            jobData.job.stop();
            jobData.status = 'stopped';
        }
        console.log('✅ All jobs stopped');
    }

    /**
     * เริ่ม jobs ทั้งหมด
     */
    static startAllJobs() {
        console.log('▶️ Starting all cron jobs...');
        for (const [name, jobData] of this.jobs.entries()) {
            jobData.job.start();
            jobData.status = 'running';
        }
        console.log('✅ All jobs started');
    }
}

module.exports = CronScheduler;