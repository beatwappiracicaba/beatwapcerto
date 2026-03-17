require('dotenv').config();
const { transporter } = require('../src/services/mailer');

transporter.verify((err, success) => {
  if (err) {
    console.error('SMTP verify error:', err);
    process.exit(1);
  } else {
    console.log('SMTP is ready to send mail:', success);
    process.exit(0);
  }
});
