require('dotenv').config();
const Api = require('./app/api.js');
const axios = require('axios');
const CronJob = require('cron').CronJob;
const https = require('https');
const { Telegraf } = require('telegraf');
const b24 = require('b24');
const bitrix24 = new b24.Bitrix24({
		config: {
				mode: "webhook",
				host: process.env.B24_URL,
				user_id: process.env.B24_ID,
				code: process.env.B24_TOKEN
		}
});

let token;
let job = new CronJob('0 */1 * * * *', function() {
		console.log('You will see this message every 1 minutes');
		getData ()
}, null, true, 'Europe/Moscow');
job.start();

async function  getData () {

		let operation = await Api.getExcerpt();


		for (let excerpt = 0; excerpt < operation.length; excerpt++) {
				if (operation[excerpt].payerInn === process.env.TINKOFF_INN) continue;

				console.log(operation[excerpt]);

				let revision = await Api.getPaymentRevision(operation[excerpt]);
				console.log(revision);
				if (revision === false) {

						let shbinvoiceID = operation[excerpt].paymentPurpose.match(/((1-\d\d\d))/g);
						let paymentId = await Api.addPayment(operation[excerpt]);
						let quote = await Api.getQuote();
						let invoiceID;
						let responsible;
						let linkDeal;

						if(shbinvoiceID !== null) {

								invoiceID = await bitrix24.callMethod('crm.invoice.list?filter[ACCOUNT_NUMBER]='+shbinvoiceID[0]+'&select[]=ID&select[]=ACCOUNT_NUMBER');

								if(typeof invoiceID.result[0].ID !== "undefined") {
										let invoice = await bitrix24.callMethod('crm.invoice.get', {ID: await invoiceID.result[0].ID});
										let user = await bitrix24.callMethod('user.get', {ID: invoice.result.RESPONSIBLE_ID});
										responsible = `Ответственный: ${user.result[0].NAME + ' ' + user.result[0].LAST_NAME}`;
										linkDeal = `Сделка: https://company.bitrix24.ru/crm/deal/details/${invoice.result.UF_DEAL_ID}/`;
								}
						}

						let message = [
								`Сумма: ${operation[excerpt].amount} ₽`,
								`Дата: ${operation[excerpt].chargeDate}`,
								`Плательщик: ${operation[excerpt].payerName}`,
								`Назначение: ${operation[excerpt].paymentPurpose}`,
								`ИНН: ${operation[excerpt].payerInn}`,
								`Номер счёта: ${operation[excerpt].payerAccount}`,
								`Корр.счёт: ${operation[excerpt].payerCorrAccount}`,
								`БИК: ${operation[excerpt].payerBic}`,
								`КПП: ${operation[excerpt].payerKpp}`,
								responsible,
								linkDeal,
								//quote
						];

						//Telgram bot
						const bot = new Telegraf(process.env.BOT_TOKEN);
						bot.telegram.sendMessage('-100999999999', message.join("\n"), {parse_mode: "HTML"});
				}
		}
}
