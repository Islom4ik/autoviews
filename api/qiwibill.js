require('dotenv').config();
const QiwiBillPaymentsAPI = require('@qiwi/bill-payments-node-js-sdk');
const SECRET_KEY = process.env.QIWISECRETKEY;
const public_key = process.env.QIWIPUBLICKKEY;
const qiwiApi = new QiwiBillPaymentsAPI(SECRET_KEY);

module.exports = {public_key, qiwiApi};


