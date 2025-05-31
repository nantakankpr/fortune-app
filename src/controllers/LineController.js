const { client } = require('../services/lineService');

class LineController {
  async handleWebhook(events) {
    try {
      await Promise.all(events.map(event => this.handleEvent(event)));
    } catch (err) {
      console.error('LINE webhook error:', err);
    }
  }

  async handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') return;
    const userMessage = event.message.text;
    const replyToken = event.replyToken;

    if (userMessage === 'package') {
      await this.replyPackage(replyToken);
    } else if (userMessage === 'help') {
      await this.replyHelp(replyToken);
    }

  }

  async replyPackage(replyToken) {
    const message = {
      type: 'flex',
      altText: 'แพ็กเกจคำทำนาย',
      contents: {
        type: 'carousel',
        contents: [
          // ทดลอง 1 วัน
          {
            type: 'bubble',
            size: 'kilo',
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              contents: [
                {
                  type: 'text',
                  text: 'ทดลอง 1 วัน',
                  weight: 'bold',
                  size: 'xl',
                  color: '#0066FF'
                },
                {
                  type: 'text',
                  text: 'ฟรี',
                  size: 'md',
                  weight: 'bold',
                  color: '#00B900'
                },
                {
                  type: 'text',
                  text: 'ดวงรายวัน 1 ประเภท\n(ความรัก)',
                  size: 'sm',
                  wrap: true,
                  margin: 'md'
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#00B900',
                  action: {
                    type: 'uri',
                    label: 'เริ่มใช้งานฟรี',
                    uri: 'https://yourdomain.com/subscribe/trial'
                  }
                }
              ]
            }
          },
          // Basic
          {
            type: 'bubble',
            size: 'kilo',
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              contents: [
                {
                  type: 'text',
                  text: 'Basic',
                  weight: 'bold',
                  size: 'xl',
                  color: '#FF6600'
                },
                {
                  type: 'text',
                  text: '฿99 / เดือน',
                  size: 'md',
                  weight: 'bold'
                },
                {
                  type: 'text',
                  text: 'ดวงรายวัน 3 ประเภท\n(ความรัก, การงาน, การเงิน)',
                  size: 'sm',
                  wrap: true,
                  margin: 'md'
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#FF6600',
                  action: {
                    type: 'uri',
                    label: 'สมัคร Basic',
                    uri: 'https://yourdomain.com/subscribe/basic'
                  }
                }
              ]
            }
          },
          // Premium
          {
            type: 'bubble',
            size: 'kilo',
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              contents: [
                {
                  type: 'text',
                  text: 'Premium',
                  weight: 'bold',
                  size: 'xl',
                  color: '#9933CC'
                },
                {
                  type: 'text',
                  text: '฿199 / เดือน',
                  size: 'md',
                  weight: 'bold'
                },
                {
                  type: 'text',
                  text: 'ดวงรายวัน + คำแนะนำเสริมดวง\n+ ทำนายรายสัปดาห์',
                  size: 'sm',
                  wrap: true,
                  margin: 'md'
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#9933CC',
                  action: {
                    type: 'uri',
                    label: 'สมัคร Premium',
                    uri: 'https://yourdomain.com/subscribe/premium'
                  }
                }
              ]
            }
          }
        ]
      }
    };

    try {
      await client.replyMessage(replyToken, message);
    } catch (err) {
      console.error('Reply package error:', err);
    }
  }


  async replyHelp(replyToken) {
    const message = {
      type: "text",
      text: "หากต้องการความช่วยเหลือ กรุณาติดต่อเราที่:\n\n📞 โทร: 123-456-7890\n✉️ อีเมล: support@example.com"
    };

    try {
      await client.replyMessage(replyToken, message);
    } catch (err) {
      console.error('Reply error:', err);
    }
  }
}

module.exports = new LineController();
