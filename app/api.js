require('dotenv').config();
const axios = require('axios');
const qs = require('querystring');
const date = require('date-and-time');
const dbPool = require('./db.js');

module.exports = class Api {

  static inn = process.env.TINKOFF_INN;
  static accountNumber = process.env.TINKOFF_ACCOUNT_NUMBER;
  static clientToken = process.env.TINKOFF_CLIENT_TOKEN;
  static refreshToken = process.env.TINKOFF_TOKEN;
  static apiUrl = 'https://openapi.tinkoff.ru';

  /**
   * Получние списка счетов
   * Return object|object
   */
  static getExcerpt(token) {

    let dateFrom = new Date(new Date().getTime() - 86400000);
    let dateTill = new Date();
    const requestBody = {
      accountNumber: this.accountNumber,
      from: date.format(dateFrom, 'YYYY-MM-DD'),
      till: date.format(dateTill, 'YYYY-MM-DD')
    };
    return new Promise((resolve) => {
        axios.defaults.headers.common["Authorization"] = `Bearer ${this.clientToken}`;
        //axios.get(this.apiUrl + '/sme/api/v1/partner/company/' + this.inn + '/excerpt?' + qs.stringify(requestBody))
				axios.get('https://business.tinkoff.ru/openapi/api/v1/bank-statement?' + qs.stringify(requestBody))
        .then((response) => {
						let operation = response.data.operation;
						resolve(operation);
        }, (err) => {
          resolve(undefined);
        })
    })
  }

  /**
   * Получние токена
   * Return string|null
   */
  /*
  static updateToken() {
    const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
    const requestBody = {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    };
    return new Promise(resolve => {
       axios.post(this.apiUrl + '/sso/secure/token', qs.stringify(requestBody), config)
			//	axios.post('https://id.tinkoff.ru/auth/token', qs.stringify(requestBody), config)
      .then((response) => {
        resolve(response.data.access_token);
      }, (err) => {
        resolve(undefined);
      })
    })
  }
   */

  static getPaymentRevision(params) {
    return new Promise((resolve, reject) => {
				let dateStart = new Date(new Date().getTime()- 172800000);
				let dateEnd = new Date();
				let payerInn = typeof params.payerInn !== 'undefined' ? params.payerInn: 0;
				let payerAccount = typeof params.payerAccount !== 'undefined' ? params.payerAccount: 0;

				let queryString = 'SELECT * FROM bank_payment_revision WHERE payment_id = ? AND payer_inn = ? AND timestamp BETWEEN ? AND ? LIMIT 1';
				let queryString2 = 'SELECT * FROM bank_payment_revision WHERE payment_id = ? AND payer_account = ? AND timestamp BETWEEN ? AND ? LIMIT 1';

				dbPool.query(queryString, [
						params.id,
						payerInn,
						date.format(dateStart, 'YYYY-MM-DD'),
						date.format(dateEnd, 'YYYY-MM-DD')
						],
						function (err, results, fields) {
								if (err) {
										console.error(err);
										reject(err);
								}

								if (results.length > 0) {
										resolve(true);
								}

								dbPool.query(queryString2, [
										params.id,
										payerAccount,
										date.format(dateStart, 'YYYY-MM-DD'),
										date.format(dateEnd, 'YYYY-MM-DD')
									],
									function (err, results, fields) {
											if (err) {
													console.error(err);
													reject(err);
											}

											if (results.length > 0) {
													resolve(true);
											} else {
													resolve(false);
											}
									}
								);
						}
				);
    });
  }

  static addPayment(params) {
    let dateEnd = new Date();
		let payerInn = typeof params.payerInn !== 'undefined' ? params.payerInn: 0;
		let payerAccount = typeof params.payerAccount !== 'undefined' ? params.payerAccount: 0;

    return new Promise((resolve) => {
      dbPool.getConnection(function(err, connection) {
					if(err){console.log('err insert bank_payment_revision')}
        if (!err) {

        	connection.query(`INSERT INTO payment SET company_id = 1, amount = ${params.amount}, counterparty = '${params.payerName}', purpose = '${params.paymentPurpose}', date = '${params.chargeDate}'`, function (err, results, fields) { resolve(results.insertId) });
          connection.query(`INSERT INTO bank_payment_revision SET payment_id = ${params.id}, payer_inn = ${payerInn}, payer_account = ${payerAccount}, timestamp = '${params.chargeDate}'`, function (err, results, fields) {});
        }
      });
    });
  }

  static getGoal(sumGoal, dateStartGoal, dateEndGoal) {
    return new Promise((resolve) => {
      dbPool.getConnection(function(err, connection) {
					if(err){console.log('err select payment')}
        if (!err) {
          connection.query(`SELECT amount FROM payment WHERE is_deleted = 0 AND date BETWEEN '${dateStartGoal}' AND  '${dateEndGoal}'`, async (err, results, fields) => {
            let sum_year = 0;
            for(let sum of results){sum_year = sum_year + sum.amount}
            resolve(sumGoal - sum_year);
          });
        }
      });
    });
  }

  /**
   * Цитатник
   * Return string|null
   */
  static getQuote() {
    return new Promise(resolve => {
      axios.get('http://api.forismatic.com/api/1.0/?method=getQuote&key=457653&format=json&lang=ru').then((response) => {
        resolve(`${response.data.quoteText} - ${response.data.quoteAuthor}`)
      }, (err) => {
        resolve(null);
      })
    })
  }

}
