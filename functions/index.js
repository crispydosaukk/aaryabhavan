const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Helper: create Gmail transporter using firebase config
function createTransporter() {
    try {
        const config = functions.config();

        if (!config || !config.gmail || !config.gmail.email || !config.gmail.password) {
            console.error('❌ Firebase config not found! Available config:', config);
            // Fallback to environment variables (for local testing)
            const gmailEmail = process.env.GMAIL_EMAIL || 'ABFoodsuk@gmail.com';
            const gmailPassword = process.env.GMAIL_PASSWORD || '';

            return nodemailer.createTransport({
                service: 'gmail',
                auth: { user: gmailEmail, pass: gmailPassword },
            });
        }

        const gmailEmail = config.gmail.email;
        const gmailPassword = config.gmail.password;
        console.log('✅ Firebase config loaded successfully');

        return nodemailer.createTransport({
            service: 'gmail',
            auth: { user: gmailEmail, pass: gmailPassword },
        });
    } catch (error) {
        console.error('❌ Error creating transporter:', error);
        throw error;
    }
}

// ---- Send Waste Report Email ----
// Callable function: accepts { pdfBase64, startDate, endDate }
exports.sendWasteReportEmail = functions.https.onCall(async (data, context) => {
    try {
        const { pdfBase64, startDate, endDate } = data;

        if (!pdfBase64) {
            throw new functions.https.HttpsError('invalid-argument', 'PDF data is required.');
        }

        const transporter = createTransporter();

        const recipients = [
            'karthik@nk-ab.com',
            'digitalbotsolutions@gmail.com',
            // 'sreedarpariserla0@gmail.com'
        ];

        const dateRange = startDate && endDate
            ? `${startDate} to ${endDate}`
            : new Date().toISOString().split('T')[0];

        const mailOptions = {
            from: '"Arya Bhavan - Central Kitchen" <ABFoodsuk@gmail.com>',
            to: recipients.join(', '),
            subject: `📊 Waste Management Report - ${dateRange}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
                     color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 25px; border: 1px solid #ddd;
                      border-radius: 0 0 10px 10px; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;
                     color: #666; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗑️ Waste Management Report</h1>
              <p>Arya Bhavan - Central Kitchen</p>
            </div>
            <div class="content">
              <h3>Waste Report for: ${dateRange}</h3>
              <p>Please find the attached waste management report PDF for the selected date range.</p>
              <div class="footer">
                <p>This is an automated email from Arya Bhavan Central Kitchen.</p>
                <p>© ${new Date().getFullYear()} Arya Bhavan. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
            attachments: [
                {
                    filename: `Waste_Report_${dateRange.replace(/\s/g, '_')}.pdf`,
                    content: pdfBase64,
                    encoding: 'base64',
                    contentType: 'application/pdf',
                },
            ],
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Waste report email sent to: ${recipients.join(', ')}`);

        // Log the email in Firestore
        await admin.firestore().collection('emailLogs').add({
            type: 'waste_report',
            recipients,
            dateRange,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'sent',
        });

        return { success: true, message: 'Waste report email sent successfully!' };
    } catch (error) {
        console.error('❌ Error sending waste report email:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
