//Все зависимости: TELEGRAF - DOTENV - MONGODB;
//Все скрытые ключи в файле: .env;

// ----------------------------------------------\\
const { Telegraf, Markup, session, Scenes } = require('telegraf');
const { collection, ObjectId } = require('../api/db');
const { qiwiApi, public_key } = require('../api/qiwibill');
require('dotenv').config();
const bot = new Telegraf(process.env.BOT_TOKEN);
module.exports = { bot, Markup, session, Scenes };
const handlersandhears = require('./handlers');
// ----------------------------------------------\\

bot.start(async (ctx) => {
    try {
        const userDB = await collection.findOne({user_id: ctx.from.id})
        if(userDB != null) {
            if (userDB.value == "WAITING") return await ctx.reply('Вы ещё не закончили предыдушее пополнение, вы можете отменить пополнение нажав на кнопку отмены.')
        }
        
        await ctx.reply('🏠 Главное меню', Markup.keyboard([
            ['📰 Мой профиль', '💳 Пополнить'],
            ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены'] 
        ]).resize());
        const userInDB = await collection.findOne({user_id: ctx.from.id});
        if(userInDB == null) {const accus = await collection.findOne({_id: ObjectId('63ccf4810394ae88ef1ad14a')});const res = accus.ids+1;await collection.insertOne({user_id: ctx.from.id, moneyc: 0, accountid: res, uorders: [], paid: [], user_fname: ctx.from.first_name, user_name: `@${ctx.from.username}`});await collection.findOneAndUpdate({_id: ObjectId('63ccf4810394ae88ef1ad14a')}, {$set: {ids: res}}); await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {usersarr: {chat_id: ctx.chat.id}}}); return await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {users: res}});};
        if(userDB.user_fname != ctx.from.first_name) await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {user_fname: ctx.from.first_name}})
        if(userDB.user_name != ctx.from.username) await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {user_name: `@${ctx.from.username}`}})
    } catch (e) {
        console.error(e);
    }
});

bot.help(async (ctx) => {
    try {
        return await ctx.reply('🏠 Главное меню', Markup.keyboard([
            ['📰 Мой профиль', '💳 Пополнить'],
            ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']
        ]).resize());
    } catch (e) {
        console.error(e);
    }
});

bot.command('cl', ctx => ctx.reply('ок', Markup.removeKeyboard()))

setInterval(async () => {
    try {
        const arrwbills = await collection.findOne({_id: ObjectId('63ccf9660394ae88ef1ad14b')})
        if(arrwbills.newbills.length == 0) return;

        for (let i = 0; i < arrwbills.newbills.length; i++) {
            const bill_id = await arrwbills.newbills[i].bill_id; 

            await qiwiApi.getBillInfo(bill_id).then(async data => {
                if (data.status.value == "WAITING") {
                    const userdb = await collection.findOne({user_bill: bill_id})
                    if(userdb.minins <= 0) {
                        await bot.telegram.deleteMessage(userdb.user_id, userdb.invoice);
                        await bot.telegram.sendMessage(userdb.user_id, 'Пополнение счета отменено.', {reply_markup: {keyboard: [['📰 Мой профиль','💳 Пополнить'], ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}});
                        await qiwiApi.cancelBill(bill_id).then(data => console.log(data.status.value));
                        await collection.findOneAndUpdate({_id: ObjectId('63ccf9660394ae88ef1ad14b')}, {$pull: {newbills: {bill_id: bill_id}}})
                        return await collection.findOneAndUpdate({user_bill: bill_id}, {$set: {value: "chilling"}})
                    }else {
                        const res = userdb.minins - 10;
                        return await collection.findOneAndUpdate({user_bill: bill_id}, {$set: {minins: res}})
                    }
                } else if(data.status.value == "PAID") {
                    await collection.findOneAndUpdate({_id: ObjectId('63ccf9660394ae88ef1ad14b')}, {$pull: {newbills: {bill_id: bill_id}}})
                    const succsesbill = await collection.findOne({user_bill: bill_id})
                    await bot.telegram.deleteMessage(succsesbill.user_id, succsesbill.invoice);
                    const userDB = await collection.findOne({user_bill: bill_id})
                    const res = await Number(userDB.moneyc) + Number(data.amount.value)
                    await collection.findOneAndUpdate({user_bill: bill_id}, {$set: {moneyc: res}})
                    await bot.telegram.sendMessage(succsesbill.user_id, 'Успешное пополнение 🟢', {reply_markup: {keyboard: [['📰 Мой профиль','💳 Пополнить'], ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
                    const ordc = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
                    const rss = await Number(ordc.ordersc) + 1;
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {ordersc: `${rss}`}})
                    const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}); const money = `${Number(admdb.moneyget)+ Number(data.amount.value)}`; await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {moneyget: `${money}`}});
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {orders: data}})
                    await collection.findOneAndUpdate({user_bill: bill_id}, {$push: {paid: bill_id}})
                    return await collection.findOneAndUpdate({user_bill: bill_id}, {$set: {value: "chilling"}})

                }else {
                    console.log('REJECTED DATA');
                }
            }).catch(err => console.log('error'));
            continue;
        }
    } catch (e) {
        console.error(e);
    }
}, 10000);

bot.launch({dropPendingUpdates: true});
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));