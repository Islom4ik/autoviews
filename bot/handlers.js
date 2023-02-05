const { collection, ObjectId } = require("../api/db");
const { qiwiApi, public_key } = require("../api/qiwibill");
const { bot, Markup, session, Scenes } = require("./bot");
const linkToChanel = 'https://t.me/viewik_info'; // Ссылка на канал которая появляеться при нажатии на кнопку 📰 Мой профиль
const axios = require('axios');
const { enter, leave } = Scenes.Stage;

const moneytopup = new Scenes.BaseScene("moneytopup");
moneytopup.enter(async ctx => {
    try {
        return await ctx.reply('Введите жалаемую сумму для пополнения:', Markup.keyboard([['Отменить пополнение 🔴']]).resize());
    } catch (e) {
        console.error(e);
    }
});

moneytopup.on('text', async ctx => {
    try {
        if(ctx.message.text == 'Отменить пополнение 🔴') {
            await ctx.reply('Отменено.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
            ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
            return await ctx.scene.leave('moneytopup')
        }

        if(ctx.message.text == 'Отменить пополнение 🟠') {
            await ctx.reply('Отмена...', {reply_markup: {remove_keyboard: true}})
            const userDB = await collection.findOne({user_id: ctx.from.id})
            await collection.findOneAndUpdate({_id: ObjectId('63ccf9660394ae88ef1ad14b')}, {$pull: {newbills: {bill_id: userDB.user_bill}}})
            await qiwiApi.cancelBill(userDB.user_bill).then(data => console.log(data.status.value)).catch(err => console.log('err'))
            await ctx.reply('Отменено.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
            ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
            await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {value: "chilling"}})
            return await ctx.scene.leave('moneytopup')
        }
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\-\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Невозможно пополнить счет нулевой или отрицательной суммой.\nВведите сумму для пополнения:');
        const num = ctx.message.text;
        const chekn = num.toString();
        console.log(chekn);
        if(chekn[0] < '1') {
            await ctx.reply('Невозможно пополнить счет нулевой или отрицательной суммой.');
            return await ctx.scene.enter('moneytopup');
        }else {
            await ctx.reply('ОК', {reply_markup: {keyboard: [['Отменить пополнение 🟠']], resize_keyboard: true}});
            // timeouttopay
            const date = await new Date();
            await date.setMinutes(date.getMinutes() + 10);
            const localdt = await date.toLocaleString("ru", {timeZone: "Europe/Moscow", year: 'numeric', month: '2-digit', day: '2-digit',hour: '2-digit',minute: '2-digit',second: '2-digit',timeZoneName:'short'});
            const isoString = await date.toISOString();
            // timeouttopay
            const genbill = await collection.findOne({_id: ObjectId('63ccf9660394ae88ef1ad14b')});
            const res = genbill.bills + 1;
            const params = {
                public_key,
                amount: chekn,
                bill_id: res,
                successUrl: 'https://t.me/dprodqbot$start=oplata1',
                expirationDateTime: `${isoString}`
            }
            const link = qiwiApi.createPaymentForm(params);
            await collection.findOneAndUpdate({_id: ObjectId('63ccf9660394ae88ef1ad14b')}, {$push: {newbills: {bill_id: res}}})
            await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {user_bill: res}})
            await collection.findOneAndUpdate({_id: ObjectId('63ccf9660394ae88ef1ad14b')}, {$set: {bills: res}})
            await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {value: "WAITING"}})
            await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {minins: 1500}})
            const invoice = await ctx.replyWithHTML('Способы пополнения:', Markup.inlineKeyboard([
                [Markup.button.url('QIWI | CARD', link)]
            ]));
            await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {invoice: invoice.message_id}})
        }
    } catch (e) {
        console.error(e);
    }
})

const getgroup = new Scenes.BaseScene("getgroup");
getgroup.enter(async ctx => {
    try {
        return await ctx.reply('ЗАПРЕЩЕНА НАКРУТКА ГРУПП И ПОСТОВ ОТНОСЯЩИХСЯ К ТЕМАТИКЕ НАРК🚫ТЫ И П🚫РНО. ТАКИЕ ЗАКАЗЫ БУДУТ ЗАКРЫВАТСЯ СРАЗУ БЕЗ ВОЗВРАТА СРЕДСТВ!\n\nВведите ссылку на канал. Пример: @mygroupname', {reply_markup: {keyboard: [['Отменить ❌']],  resize_keyboard: true}})
    } catch (e) {
        console.error(e);
    }
});

getgroup.on('text', async ctx => {
    try {
        if (ctx.message.text == 'Отменить ❌') {
            await ctx.reply('Отменено.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
            ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
            return ctx.scene.leave('getgroup')
        }
        const text = await ctx.message.text.replace(/[^a-zа-яё@_]/gi, '');
        if (text[0] != '@') return await ctx.reply('Пожалуйста, можете предоставить информацию, как на следующем примере:\n\nПример: @mygroupname');
        const channel = await bot.telegram.getChat(text);
        if(channel.type != 'channel') return await ctx.reply('Пожалуйста, введите user_name телеграмм канала:');
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {chanelinf: {username: channel.username, channelid: channel.id, channeltitle: channel.title}}})
        return await ctx.scene.enter('gettar')
    } catch (e) {
        await ctx.reply('Произошла ошибка, попробуйте ввести все как на примере выше.')
        console.error(e);
    }
})

const gettar = new Scenes.BaseScene("gettar");
gettar.enter(async ctx => {
    try {
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.reply('Выберите один из следующих тарифов:', {reply_markup: {remove_keyboard: true}})
        return await ctx.reply(`👁‍🗨 Тариф - 1\nЦелевое количество просмотров: 2500 за день\nСкорость за час: +100 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t17} руб\n📗 14 дней - ${admDB.t114} руб\n📘 30 дней - ${admDB.t130} руб\n\n👁‍🗨 Тариф - 2\nЦелевое количество просмотров: 6000 за день\nСкорость за час: +250 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t27} руб\n📗 14 дней - ${admDB.t214} руб\n📘 30 дней - ${admDB.t230} руб\n\n👁‍🗨 Тариф - 3\nЦелевое количество просмотров: 12000 за день\nСкорость за час: +500 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t37} руб\n📗 14 дней - ${admDB.t314} руб\n📘 30 дней - ${admDB.t330} руб`, {reply_markup: {inline_keyboard: [[Markup.button.callback('👁‍🗨 Тариф - 1', 't1')],[Markup.button.callback('👁‍🗨 Тариф - 2', 't2')],[Markup.button.callback('👁‍🗨 Тариф - 3', 't3')], [Markup.button.callback('🛑 Отменить', 'cancord')]]}});
    } catch (e) {
        console.error(e);
    }
});

gettar.on('message', async ctx => {
    try {
        return await ctx.reply('Нажмите на одну из кнопок выше.')
    } catch (e) {
        console.error(e);
    }
})

gettar.action('t1', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 1}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 1\nЦелевое количество просмотров: 2500 за день\nСкорость за час: +100 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t17} руб\n📗 14 дней - ${admDB.t114} руб\n📘 30 дней - ${admDB.t130} руб`)
        return ctx.scene.enter('getdays')
    } catch (e) {
        console.error(e);
    }
})

gettar.action('cancord', async ctx => {
    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id)
        await ctx.reply('Отменено.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
        ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
        return ctx.scene.leave('gettar')
    } catch (e) {
        console.error(e);
    }
})

gettar.action('t2', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 2}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 2\nЦелевое количество просмотров: 6000 за день\nСкорость за час: +250 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t27} руб\n📗 14 дней - ${admDB.t214} руб\n📘 30 дней - ${admDB.t230} руб`)
        return ctx.scene.enter('getdays')
    } catch (e) {
        console.error(e);
    }
})

gettar.action('t3', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 3}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 3\nЦелевое количество просмотров: 12000 за день\nСкорость за час: +500 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t37} руб\n📗 14 дней - ${admDB.t314} руб\n📘 30 дней - ${admDB.t330} руб`)
        return ctx.scene.enter('getdays')
    } catch (e) {
        console.error(e);
    }
})

const getstopchan = new Scenes.BaseScene("getstopchan");
getstopchan.enter(async ctx => {
    try {
        return await ctx.reply('Введите юзернейм канала, пример - @mygroupname:', {reply_markup: {keyboard: [['Отменить 🔴']],  resize_keyboard: true}});
    } catch (e) {
        console.error(e);
    }
});

getstopchan.on('text', async ctx => {
    try {
        if (ctx.message.text == 'Отменить 🔴') {
            await ctx.reply('Отменено.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
            ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
            return await ctx.scene.leave('getstopchan')
        }
        const text = await ctx.message.text.replace(/[^a-zа-яё@_]/gi, '');
        if (text[0] != '@') return await ctx.reply('Пожалуйста, можете предоставить информацию, как на следующем примере:\n\nПример: @mygroupname');
        const channel = await bot.telegram.getChat(text);
        if(channel.type != 'channel') return await ctx.reply('Пожалуйста, введите user_name телеграмм канала:');
        const udb = await collection.findOne({user_id: ctx.from.id})
        for (let i = 0; i < udb.uorders.length; i++) {
            if(udb.uorders[i].chanel == text) {
                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/task-stop?token=${process.env.BOT_TOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        taskId: udb.uorders[i].orid
                    }
                };
            
                await axios(config)
                .then(async response => {
                    await ctx.reply('Просмотры приостановлены.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
                    return await ctx.scene.leave('getstopchan')
                })
                .catch(async error => {
                    console.log(error);
                    await ctx.reply('Что-то пошло не так...', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
                    return await ctx.scene.leave('getstopchan')
                });
            }
        }
        await ctx.reply('Данного канала нет в вашем списке задач.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
        ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
        return await ctx.scene.leave('getstopchan')
    } catch (e) {
        console.error(e);
    }
})

const getstartchan = new Scenes.BaseScene("getstartchan");
getstartchan.enter(async ctx => {
    try {
        return await ctx.reply('Введите юзернейм канала, пример - @mygroupname:', {reply_markup: {keyboard: [['Отменить 🔴']],  resize_keyboard: true}});
    } catch (e) {
        console.error(e);
    }
});

getstartchan.on('text', async ctx => {
    try {
        if (ctx.message.text == 'Отменить 🔴') {
            await ctx.reply('Отменено.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
            ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
            return await ctx.scene.leave('getstartchan')
        }
        const text = await ctx.message.text.replace(/[^a-zа-яё@_]/gi, '');
        if (text[0] != '@') return await ctx.reply('Пожалуйста, можете предоставить информацию, как на следующем примере:\n\nПример: @mygroupname');
        const channel = await bot.telegram.getChat(text);
        if(channel.type != 'channel') return await ctx.reply('Пожалуйста, введите user_name телеграмм канала:');
        const udb = await collection.findOne({user_id: ctx.from.id})
        for (let i = 0; i < udb.uorders.length; i++) {
            if(udb.uorders[i].chanel == text) {
                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/task-start?token=${process.env.BOT_TOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        taskId: udb.uorders[i].orid
                    }
                };
            
                await axios(config)
                .then(async response => {
                    await ctx.reply('Просмотры активированы.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
                    return await ctx.scene.leave('getstartchan')
                })
                .catch(async error => {
                    console.log(error);
                    await ctx.reply('Что-то пошло не так...', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
                    return await ctx.scene.leave('getstartchan')
                });
            }
        }
        await ctx.reply('Данного канала нет в вашем списке задач.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
        ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard: true}})
        return await ctx.scene.leave('getstartchan')
    } catch (e) {
        console.error(e);
    }
})

const getdays = new Scenes.BaseScene("getdays");
getdays.enter(async ctx => {
    try {
        return await ctx.reply('Выберите количество дней:', {reply_markup: {remove_keyboard: true}});
    } catch (e) {
        console.error(e);
    }
});

getdays.on('text', async ctx => {
    try {
        const myString = ctx.message.text
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\.,\\\|\/\+\-\а-я\a-z]+/g;
        if (myString.match(searchString)) return await ctx.reply('⚠️ Введите одно из количество дней из тарифа выше(7 | 14 | 30):');
        if (ctx.message.text == '7') {
            await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {days: 7}})
            const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
            const userdb = await collection.findOne({user_id: ctx.from.id})
            if (userdb.tarif == 1) {
                return await ctx.replyWithHTML(`Вы уверены что хотите приобрести ${userdb.tarif} - тариф за ${admdb.t17}₽, на 7 дней?`, Markup.inlineKeyboard([[Markup.button.callback('Да, покупаю', 'buy')], [Markup.button.callback('Нет, передумал', 'cancbuy')]]))
            } else if(userdb.tarif == 2) {
                return await ctx.replyWithHTML(`Вы уверены что хотите приобрести ${userdb.tarif} - тариф за ${admdb.t27}₽, на 7 дней?`, Markup.inlineKeyboard([[Markup.button.callback('Да, покупаю', 'buy')], [Markup.button.callback('Нет, передумал', 'cancbuy')]]))
            }else {
                return await ctx.replyWithHTML(`Вы уверены что хотите приобрести ${userdb.tarif} - тариф за ${admdb.t37}₽, на 7 дней?`, Markup.inlineKeyboard([[Markup.button.callback('Да, покупаю', 'buy')], [Markup.button.callback('Нет, передумал', 'cancbuy')]]))
            }
            
        }else if(ctx.message.text == '14') {
            await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {days: 14}})
            const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
            const userdb = await collection.findOne({user_id: ctx.from.id})
            if (userdb.tarif == 1) {
                return await ctx.replyWithHTML(`Вы уверены что хотите приобрести ${userdb.tarif} - тариф за ${admdb.t114}₽, на 14 дней?`, Markup.inlineKeyboard([[Markup.button.callback('Да, покупаю', 'buy')], [Markup.button.callback('Нет, передумал', 'cancbuy')]]))
            } else if(userdb.tarif == 2) {
                return await ctx.replyWithHTML(`Вы уверены что хотите приобрести ${userdb.tarif} - тариф за ${admdb.t214}₽, на 14 дней?`, Markup.inlineKeyboard([[Markup.button.callback('Да, покупаю', 'buy')], [Markup.button.callback('Нет, передумал', 'cancbuy')]]))
            }else {
                return await ctx.replyWithHTML(`Вы уверены что хотите приобрести ${userdb.tarif} - тариф за ${admdb.t314}₽, на 14 дней?`, Markup.inlineKeyboard([[Markup.button.callback('Да, покупаю', 'buy')], [Markup.button.callback('Нет, передумал', 'cancbuy')]]))
            }
        }else if(ctx.message.text == '30') {
            await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {days: 30}})
            const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
            const userdb = await collection.findOne({user_id: ctx.from.id})
            if (userdb.tarif == 1) {
                return await ctx.replyWithHTML(`Вы уверены что хотите приобрести ${userdb.tarif} - тариф за ${admdb.t130}₽, на 30 дней?`, Markup.inlineKeyboard([[Markup.button.callback('Да, покупаю', 'buy')], [Markup.button.callback('Нет, передумал', 'cancbuy')]]))
            } else if(userdb.tarif == 2) {
                return await ctx.replyWithHTML(`Вы уверены что хотите приобрести ${userdb.tarif} - тариф за ${admdb.t230}₽, на 30 дней?`, Markup.inlineKeyboard([[Markup.button.callback('Да, покупаю', 'buy')], [Markup.button.callback('Нет, передумал', 'cancbuy')]]))
            }else {
                return await ctx.replyWithHTML(`Вы уверены что хотите приобрести ${userdb.tarif} - тариф за ${admdb.t330}₽, на 30 дней?`, Markup.inlineKeyboard([[Markup.button.callback('Да, покупаю', 'buy')], [Markup.button.callback('Нет, передумал', 'cancbuy')]]))
            }
        }else {
            return await ctx.reply('Введите колво дней работы тарифа 7 или 14 или же 30:')
        }
    } catch (e) {
        console.error(e);
    }
})

getdays.action('cancbuy', async ctx => {
    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        await ctx.scene.leave('getdays')
        await ctx.reply('Покупка тарифа отменена.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
        ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']], resize_keyboard:true}})
        await ctx.answerCbQuery()
    } catch (e) {
        console.error(e);
    }
})

getdays.action('buy', async ctx => {
    try {
        await ctx.scene.leave('getdays')
        await ctx.editMessageText('Обработка...');
        await ctx.reply('Добавление канала...', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
        ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']],resize_keyboard: true}})
        const userdb = await collection.findOne({user_id: ctx.from.id});
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        const usermoney = await Number(userdb.moneyc);
        if (userdb.tarif == 1) {
            if (userdb.days == 7) {
                if(usermoney < admdb.t17) {
                    await ctx.reply('Не достаточно средств для покупки данного тарифа. Пожалуйста пополните ваш баланс.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']],resize_keyboard: true}})
                    return ctx.scene.leave('getdays')
                }

                var date = await new Date();
                await date.setMinutes(date.getMinutes() + 5);
                await date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + 3 * 60 * 60 * 1000);
                var day = await date.getDate().toString().padStart(2, "0");
                var month = await (date.getMonth() + 1).toString().padStart(2, "0");
                var year = await date.getFullYear();
                var hour = await date.getHours().toString().padStart(2, "0");
                var minute = await date.getMinutes().toString().padStart(2, "0");
                var second = await date.getSeconds().toString().padStart(2, "0");
                var formattedDate = await day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;

                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/views-task-add?token=${process.env.SMMBOOSTTOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        channel: `https://t.me/${userdb.chanelinf.username}`,
                        startTime: formattedDate,
                        daysCount: 7,
                        postsCount: 17,
                        postViewsCount: 2500,
                        speedMax: 100,
                        speedMin: 99,
                        country: 16
                    }
                };
            
                await axios(config)
                .then(async response => {
                    console.log(response);
                    const usrm = await String(usermoney - admdb.t17);
                    await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {moneyc: usrm}});
                    await collection.findOneAndUpdate({user_id: userdb.user_id}, {$push: {uorders: response.result.id}})
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {viewsarr: {orid: response.result.id, chanel: userdb.chanelinf.username}}})
                    return await ctx.reply('Успех! Проверьте список заказов.')
                })
                .catch(error => {
                    console.log(error);
                    return ctx.reply('Что-то пошло не так...')
                });
            }else if (userdb.days == 14) {
                if(usermoney < admdb.t114) {
                    await ctx.reply('Не достаточно средств для покупки данного тарифа. Пожалуйста пополните ваш баланс.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']],resize_keyboard: true}})
                    return ctx.scene.leave('getdays')
                }

                var date = await new Date();
                await date.setMinutes(date.getMinutes() + 5);
                await date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + 3 * 60 * 60 * 1000);
                var day = await date.getDate().toString().padStart(2, "0");
                var month = await (date.getMonth() + 1).toString().padStart(2, "0");
                var year = await date.getFullYear();
                var hour = await date.getHours().toString().padStart(2, "0");
                var minute = await date.getMinutes().toString().padStart(2, "0");
                var second = await date.getSeconds().toString().padStart(2, "0");
                var formattedDate = await day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;

                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/views-task-add?token=${process.env.SMMBOOSTTOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        channel: `https://t.me/${userdb.chanelinf.username}`,
                        startTime: formattedDate,
                        daysCount: 14,
                        postsCount: 17,
                        postViewsCount: 2500,
                        speedMax: 100,
                        speedMin: 99,
                        country: 16
                    }
                };
            
                await axios(config)
                .then(async response => {
                    const usrm = await String(usermoney - admdb.t114);
                    await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {moneyc: usrm}});
                    await collection.findOneAndUpdate({user_id: userdb.user_id}, {$push: {uorders: response.result.id}})
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {viewsarr: {orid: response.result.id, chanel: userdb.chanelinf.username}}})
                    return await ctx.reply('Успех! Проверьте список заказов.')
                })
                .catch(error => {
                    return ctx.reply('Что-то пошло не так...')
                });
            }else {
                if(usermoney < admdb.t130) {
                    await ctx.reply('Не достаточно средств для покупки данного тарифа. Пожалуйста пополните ваш баланс.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']],resize_keyboard: true}})
                    return ctx.scene.leave('getdays')
                }

                var date = await new Date();
                await date.setMinutes(date.getMinutes() + 5);
                await date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + 3 * 60 * 60 * 1000);
                var day = await date.getDate().toString().padStart(2, "0");
                var month = await (date.getMonth() + 1).toString().padStart(2, "0");
                var year = await date.getFullYear();
                var hour = await date.getHours().toString().padStart(2, "0");
                var minute = await date.getMinutes().toString().padStart(2, "0");
                var second = await date.getSeconds().toString().padStart(2, "0");
                var formattedDate = await day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;

                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/views-task-add?token=${process.env.SMMBOOSTTOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        channel: `https://t.me/${userdb.chanelinf.username}`,
                        startTime: formattedDate,
                        daysCount: 30,
                        postsCount: 17,
                        postViewsCount: 2500,
                        speedMax: 100,
                        speedMin: 99,
                        country: 16
                    }
                };
            
                await axios(config)
                .then(async response => {
                    const usrm = await String(usermoney - admdb.t130);
                    await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {moneyc: usrm}});
                    await collection.findOneAndUpdate({user_id: userdb.user_id}, {$push: {uorders: response.result.id}})
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {viewsarr: {orid: response.result.id, chanel: userdb.chanelinf.username}}})
                    return await ctx.reply('Успех! Проверьте список заказов.')
                })
                .catch(error => {
                    return ctx.reply('Что-то пошло не так...')
                });
            }
        }else if(userdb.tarif == 2) {
            if (userdb.days == 7) {
                if(usermoney < admdb.t27) {
                    await ctx.reply('Не достаточно средств для покупки данного тарифа. Пожалуйста пополните ваш баланс.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']],resize_keyboard: true}})
                    return ctx.scene.leave('getdays')
                }

                var date = await new Date();
                await date.setMinutes(date.getMinutes() + 5);
                await date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + 3 * 60 * 60 * 1000);
                var day = await date.getDate().toString().padStart(2, "0");
                var month = await (date.getMonth() + 1).toString().padStart(2, "0");
                var year = await date.getFullYear();
                var hour = await date.getHours().toString().padStart(2, "0");
                var minute = await date.getMinutes().toString().padStart(2, "0");
                var second = await date.getSeconds().toString().padStart(2, "0");
                var formattedDate = await day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;

                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/views-task-add?token=${process.env.SMMBOOSTTOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        channel: `https://t.me/${userdb.chanelinf.username}`,
                        startTime: formattedDate,
                        daysCount: 7,
                        postsCount: 17,
                        postViewsCount: 6000,
                        speedMax: 250,
                        speedMin: 249,
                        country: 16
                    }
                };
            
                await axios(config)
                .then(async response => {
                    const usrm = await String(usermoney - admdb.t27);
                    await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {moneyc: usrm}});
                    await collection.findOneAndUpdate({user_id: userdb.user_id}, {$push: {uorders: response.result.id}})
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {viewsarr: {orid: response.result.id, chanel: userdb.chanelinf.username}}})
                    return await ctx.reply('Успех! Проверьте список заказов.')
                })
                .catch(error => {
                    return ctx.reply('Что-то пошло не так...')
                });
            }else if (userdb.days == 14) {
                if(usermoney < admdb.t214) {
                    await ctx.reply('Не достаточно средств для покупки данного тарифа. Пожалуйста пополните ваш баланс.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']],resize_keyboard: true}})
                    return ctx.scene.leave('getdays')
                }

                var date = await new Date();
                await date.setMinutes(date.getMinutes() + 5);
                await date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + 3 * 60 * 60 * 1000);
                var day = await date.getDate().toString().padStart(2, "0");
                var month = await (date.getMonth() + 1).toString().padStart(2, "0");
                var year = await date.getFullYear();
                var hour = await date.getHours().toString().padStart(2, "0");
                var minute = await date.getMinutes().toString().padStart(2, "0");
                var second = await date.getSeconds().toString().padStart(2, "0");
                var formattedDate = await day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;

                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/views-task-add?token=${process.env.SMMBOOSTTOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        channel: `https://t.me/${userdb.chanelinf.username}`,
                        startTime: formattedDate,
                        daysCount: 14,
                        postsCount: 17,
                        postViewsCount: 6000,
                        speedMax: 250,
                        speedMin: 249,
                        country: 16
                    }
                };
            
                await axios(config)
                .then(async response => {
                    const usrm = await String(usermoney - admdb.t214);
                    await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {moneyc: usrm}});
                    await collection.findOneAndUpdate({user_id: userdb.user_id}, {$push: {uorders: response.result.id}})
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {viewsarr: {orid: response.result.id, chanel: userdb.chanelinf.username}}})
                    return await ctx.reply('Успех! Проверьте список заказов.')
                })
                .catch(error => {
                    return ctx.reply('Что-то пошло не так...')
                });
            }else {
                if(usermoney < admdb.t230) {
                    await ctx.reply('Не достаточно средств для покупки данного тарифа. Пожалуйста пополните ваш баланс.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']],resize_keyboard: true}})
                    return ctx.scene.leave('getdays')
                }

                var date = await new Date();
                await date.setMinutes(date.getMinutes() + 5);
                await date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + 3 * 60 * 60 * 1000);
                var day = await date.getDate().toString().padStart(2, "0");
                var month = await (date.getMonth() + 1).toString().padStart(2, "0");
                var year = await date.getFullYear();
                var hour = await date.getHours().toString().padStart(2, "0");
                var minute = await date.getMinutes().toString().padStart(2, "0");
                var second = await date.getSeconds().toString().padStart(2, "0");
                var formattedDate = await day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;

                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/views-task-add?token=${process.env.SMMBOOSTTOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        channel: `https://t.me/${userdb.chanelinf.username}`,
                        startTime: formattedDate,
                        daysCount: 30,
                        postsCount: 17,
                        postViewsCount: 6000,
                        speedMax: 250,
                        speedMin: 249,
                        country: 16
                    }
                };
            
                await axios(config)
                .then(async response => {
                    const usrm = await String(usermoney - admdb.t230);
                    await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {moneyc: usrm}});
                    await collection.findOneAndUpdate({user_id: userdb.user_id}, {$push: {uorders: response.result.id}})
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {viewsarr: {orid: response.result.id, chanel: userdb.chanelinf.username}}})
                    return await ctx.reply('Успех! Проверьте список заказов.')
                })
                .catch(error => {
                    return ctx.reply('Что-то пошло не так...')
                });
            }
        }else if(userdb.tarif == 3) {
            if (userdb.days == 7) {
                if(usermoney < admdb.t37) {
                    await ctx.reply('Не достаточно средств для покупки данного тарифа. Пожалуйста пополните ваш баланс.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']],resize_keyboard: true}})
                    return ctx.scene.leave('getdays')
                }

                var date = await new Date();
                await date.setMinutes(date.getMinutes() + 5);
                await date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + 3 * 60 * 60 * 1000);
                var day = await date.getDate().toString().padStart(2, "0");
                var month = await (date.getMonth() + 1).toString().padStart(2, "0");
                var year = await date.getFullYear();
                var hour = await date.getHours().toString().padStart(2, "0");
                var minute = await date.getMinutes().toString().padStart(2, "0");
                var second = await date.getSeconds().toString().padStart(2, "0");
                var formattedDate = await day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;

                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/views-task-add?token=${process.env.SMMBOOSTTOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        channel: `https://t.me/${userdb.chanelinf.username}`,
                        startTime: formattedDate,
                        daysCount: 7,
                        postsCount: 17,
                        postViewsCount: 12000,
                        speedMax: 500,
                        speedMin: 499,
                        country: 16
                    }
                };
            
                await axios(config)
                .then(async response => {
                    const usrm = await String(usermoney - admdb.t37);
                    await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {moneyc: usrm}});
                    await collection.findOneAndUpdate({user_id: userdb.user_id}, {$push: {uorders: response.result.id}})
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {viewsarr: {orid: response.result.id, chanel: userdb.chanelinf.username}}})
                    return await ctx.reply('Успех! Проверьте список заказов.')
                })
                .catch(error => {
                    return ctx.reply('Что-то пошло не так...')
                });
            }else if (userdb.days == 14) {
                if(usermoney < admdb.t314) {
                    await ctx.reply('Не достаточно средств для покупки данного тарифа. Пожалуйста пополните ваш баланс.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']],resize_keyboard: true}})
                    return ctx.scene.leave('getdays')
                }

                var date = await new Date();
                await date.setMinutes(date.getMinutes() + 5);
                await date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + 3 * 60 * 60 * 1000);
                var day = await date.getDate().toString().padStart(2, "0");
                var month = await (date.getMonth() + 1).toString().padStart(2, "0");
                var year = await date.getFullYear();
                var hour = await date.getHours().toString().padStart(2, "0");
                var minute = await date.getMinutes().toString().padStart(2, "0");
                var second = await date.getSeconds().toString().padStart(2, "0");
                var formattedDate = await day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;

                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/views-task-add?token=${process.env.SMMBOOSTTOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        channel: `https://t.me/${userdb.chanelinf.username}`,
                        startTime: formattedDate,
                        daysCount: 14,
                        postsCount: 17,
                        postViewsCount: 12000,
                        speedMax: 500,
                        speedMin: 499,
                        country: 16
                    }
                };
            
                await axios(config)
                .then(async response => {
                    const usrm = await String(usermoney - admdb.t314);
                    await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {moneyc: usrm}});
                    await collection.findOneAndUpdate({user_id: userdb.user_id}, {$push: {uorders: response.result.id}})
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {viewsarr: {orid: response.result.id, chanel: userdb.chanelinf.username}}})
                    return await ctx.reply('Успех! Проверьте список заказов.')
                })
                .catch(error => {
                    return ctx.reply('Что-то пошло не так...')
                });
            }else {
                if(usermoney < admdb.t330) {
                    await ctx.reply('Не достаточно средств для покупки данного тарифа. Пожалуйста пополните ваш баланс.', {reply_markup: {keyboard: [['📰 Мой профиль', '💳 Пополнить'],
                    ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']],resize_keyboard: true}})
                    return ctx.scene.leave('getdays')
                }

                var date = await new Date();
                await date.setMinutes(date.getMinutes() + 5);
                await date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + 3 * 60 * 60 * 1000);
                var day = await date.getDate().toString().padStart(2, "0");
                var month = await (date.getMonth() + 1).toString().padStart(2, "0");
                var year = await date.getFullYear();
                var hour = await date.getHours().toString().padStart(2, "0");
                var minute = await date.getMinutes().toString().padStart(2, "0");
                var second = await date.getSeconds().toString().padStart(2, "0");
                var formattedDate = await day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;

                const config = await {
                    method: 'post',
                    url: `https://smmboost.ru/api/views-task-add?token=${process.env.SMMBOOSTTOKEN}`, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        channel: `https://t.me/${userdb.chanelinf.username}`,
                        startTime: formattedDate,
                        daysCount: 30,
                        postsCount: 17,
                        postViewsCount: 12000,
                        speedMax: 500,
                        speedMin: 499,
                        country: 16
                    }
                };
            
                await axios(config)
                .then(async response => {
                    const usrm = await String(usermoney - admdb.t330);
                    await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {moneyc: usrm}});
                    await collection.findOneAndUpdate({user_id: userdb.user_id}, {$push: {uorders: response.result.id}})
                    await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$push: {viewsarr: {orid: response.result.id, chanel: userdb.chanelinf.username}}})
                    return await ctx.reply('Успех! Проверьте список заказов.')
                })
                .catch(error => {
                    return ctx.reply('Что-то пошло не так...')
                });
            }
        }
        await ctx.answerCbQuery(); 
    } catch (e) {
        console.error(e);
    }
})

const getadmtar = new Scenes.BaseScene("getadmtar");
getadmtar.enter(async ctx => {
    try {
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.reply('Выберите один из следующих тарифов:', {reply_markup: {remove_keyboard: true}})
        return await ctx.reply(`👁‍🗨 Тариф - 1\nЦелевое количество просмотров: 2500 за день\nСкорость за час: +100 просмотров\nКол-во дней:\n📕 7 дней - <b>${admDB.t17}</b> руб\n📗 14 дней - <b>${admDB.t114}</b> руб\n📘 30 дней - <b>${admDB.t130}</b> руб\n\n👁‍🗨 Тариф - 2\nЦелевое количество просмотров: 6000 за день\nСкорость за час: +250 просмотров\nКол-во дней:\n📕 7 дней - <b>${admDB.t27}</b> руб\n📗 14 дней - <b>${admDB.t214}</b> руб\n📘 30 дней - <b>${admDB.t230}</b> руб\n\n👁‍🗨 Тариф - 3\nЦелевое количество просмотров: 12000 за день\nСкорость за час: +500 просмотров\nКол-во дней:\n📕 7 дней - <b>${admDB.t37}</b> руб\n📗 14 дней - <b>${admDB.t314}</b> руб\n📘 30 дней - <b>${admDB.t330}</b> руб`, {parse_mode: "HTML",reply_markup: {inline_keyboard: [[Markup.button.callback('👁‍🗨 Тариф - 1', 'at1')],[Markup.button.callback('👁‍🗨 Тариф - 2', 'at2')],[Markup.button.callback('👁‍🗨 Тариф - 3', 'at3')], [Markup.button.callback('🟢 Готово', 'suply')]]}});
    } catch (e) {
        console.error(e);
    }
});

getadmtar.action('suply', async ctx => {
    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id)
        await ctx.reply('Изменено 🟢', {reply_markup: {keyboard: [['Редактировать цены тарифов 📝', 'Управление пользователями 👤'],['Статистика 📈', 'История 🗂'], ['🏠 Назад на главное меню']], resize_keyboard: true}})
        return ctx.scene.leave('getadmtar')
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('at1', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 2}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`Выберите кол-во дней:\n\n👁‍🗨 Тариф - 1\nЦелевое количество просмотров: 6000 за день\nСкорость за час: +250 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t17} руб\n📗 14 дней - ${admDB.t214} руб\n📘 30 дней - ${admDB.t130} руб`, {reply_markup: {inline_keyboard: [[Markup.button.callback('7 - дней', 't1and7d')], [Markup.button.callback('14 - дней', 't1and14d')], [Markup.button.callback('30 - дней', 't1and30d')]]}})
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('at2', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 2}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`Выберите кол-во дней:\n\n👁‍🗨 Тариф - 2\nЦелевое количество просмотров: 6000 за день\nСкорость за час: +250 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t27} руб\n📗 14 дней - ${admDB.t214} руб\n📘 30 дней - ${admDB.t230} руб`, {reply_markup: {inline_keyboard: [[Markup.button.callback('7 - дней', 't2and7d')], [Markup.button.callback('14 - дней', 't2and14d')], [Markup.button.callback('30 - дней', 't2and30d')]]}})
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('at3', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 3}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`Выберите кол-во дней:\n\n👁‍🗨 Тариф - 3\nЦелевое количество просмотров: 12000 за день\nСкорость за час: +500 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t37} руб\n📗 14 дней - ${admDB.t314} руб\n📘 30 дней - ${admDB.t330} руб`, {reply_markup: {inline_keyboard: [[Markup.button.callback('7 - дней', 't3and7d')], [Markup.button.callback('14 - дней', 't3and14d')], [Markup.button.callback('30 - дней', 't3and30d')]]}})
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('t1and7d', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 2}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 1\n\n📘 7 дней - ${admDB.t17} руб`)
        return ctx.scene.enter('t1and7d')
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('t1and14d', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 2}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 1\n\n📘 14 дней - ${admDB.t114} руб`)
        return ctx.scene.enter('t1and14d')
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('t1and30d', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 3}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 1\n\n📘 30 дней - ${admDB.t130} руб`)
        return ctx.scene.enter('t1and30d')
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('t2and7d', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 2}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 2\n\n📘 7 дней - ${admDB.t27} руб`)
        return ctx.scene.enter('t2and7d')
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('t2and14d', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 2}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 2\n\n📘 14 дней - ${admDB.t214} руб`)
        return ctx.scene.enter('t2and14d')
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('t2and30d', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 3}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 2\n\n📘 30 дней - ${admDB.t230} руб`)
        return ctx.scene.enter('t2and30d')
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('t3and7d', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 2}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 3\n\n📘 7 дней - ${admDB.t37} руб`)
        return ctx.scene.enter('t3and7d')
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('t3and14d', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 2}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 3\n\n📘 14 дней - ${admDB.t314} руб`)
        return ctx.scene.enter('t3and14d')
    } catch (e) {
        console.error(e);
    }
})

getadmtar.action('t3and30d', async ctx => {
    try {
        await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {tarif: 3}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await ctx.editMessageText(`👁‍🗨 Тариф - 3\n\n📘 30 дней - ${admDB.t330} руб`)
        return ctx.scene.enter('t3and30d')
    } catch (e) {
        console.error(e);
    }
})


// editor:
const t1and7d = new Scenes.BaseScene("t1and7d");
t1and7d.enter(async ctx => {
    try {
        await ctx.reply('Введите сумму:')
    } catch (e) {
        console.error(e);
    }
});

t1and7d.on('text', async ctx => {
    try {
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Введите сумму(число):');
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {t17: ctx.message.text}})
        await ctx.reply(`Изменено:\n\n${admdb.t17} -> ${ctx.message.text}`)
        return await ctx.scene.enter('getadmtar')
    } catch (e) {
        console.error(e);
    }
})

const t1and14d = new Scenes.BaseScene("t1and14d");
t1and14d.enter(async ctx => {
    try {
        await ctx.reply('Введите сумму:')
    } catch (e) {
        console.error(e);
    }
});

t1and14d.on('text', async ctx => {
    try {
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Введите сумму(число):');
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {t114: ctx.message.text}})
        await ctx.reply(`Изменено:\n\n${admdb.t114} -> ${ctx.message.text}`)
        return await ctx.scene.enter('getadmtar')
    } catch (e) {
        console.error(e);
    }
})

const t1and30d = new Scenes.BaseScene("t1and30d");
t1and30d.enter(async ctx => {
    try {
        await ctx.reply('Введите сумму:')
    } catch (e) {
        console.error(e);
    }
});

t1and30d.on('text', async ctx => {
    try {
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Введите сумму(число):');
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {t130: ctx.message.text}})
        await ctx.reply(`Изменено:\n\n${admdb.t130} -> ${ctx.message.text}`)
        return await ctx.scene.enter('getadmtar')
    } catch (e) {
        console.error(e);
    }
})

const t2and7d = new Scenes.BaseScene("t2and7d");
t2and7d.enter(async ctx => {
    try {
        await ctx.reply('Введите сумму:')
    } catch (e) {
        console.error(e);
    }
});

t2and7d.on('text', async ctx => {
    try {
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Введите сумму(число):');
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {t27: ctx.message.text}})
        await ctx.reply(`Изменено:\n\n${admdb.t27} -> ${ctx.message.text}`)
        return await ctx.scene.enter('getadmtar')
    } catch (e) {
        console.error(e);
    }
})

const t2and14d = new Scenes.BaseScene("t2and14d");
t2and14d.enter(async ctx => {
    try {
        await ctx.reply('Введите сумму:')
    } catch (e) {
        console.error(e);
    }
});

t2and14d.on('text', async ctx => {
    try {
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Введите сумму(число):');
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {t214: ctx.message.text}})
        await ctx.reply(`Изменено:\n\n${admdb.t214} -> ${ctx.message.text}`)
        return await ctx.scene.enter('getadmtar')
    } catch (e) {
        console.error(e);
    }
})

const t2and30d = new Scenes.BaseScene("t2and30d");
t2and30d.enter(async ctx => {
    try {
        await ctx.reply('Введите сумму:')
    } catch (e) {
        console.error(e);
    }
});

t2and30d.on('text', async ctx => {
    try {
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Введите сумму(число):');
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {t230: ctx.message.text}})
        await ctx.reply(`Изменено:\n\n${admdb.t230} -> ${ctx.message.text}`)
        return await ctx.scene.enter('getadmtar')
    } catch (e) {
        console.error(e);
    }
})

const t3and7d = new Scenes.BaseScene("t3and7d");
t3and7d.enter(async ctx => {
    try {
        await ctx.reply('Введите сумму:')
    } catch (e) {
        console.error(e);
    }
});

t3and7d.on('text', async ctx => {
    try {
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Введите сумму(число):');
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {t37: ctx.message.text}})
        await ctx.reply(`Изменено:\n\n${admdb.t37} -> ${ctx.message.text}`)
        return await ctx.scene.enter('getadmtar')
    } catch (e) {
        console.error(e);
    }
})

const t3and14d = new Scenes.BaseScene("t3and14d");
t3and14d.enter(async ctx => {
    try {
        await ctx.reply('Введите сумму:')
    } catch (e) {
        console.error(e);
    }
});

t3and14d.on('text', async ctx => {
    try {
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Введите сумму(число):');
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {t314: ctx.message.text}})
        await ctx.reply(`Изменено:\n\n${admdb.t314} -> ${ctx.message.text}`)
        return await ctx.scene.enter('getadmtar')
    } catch (e) {
        console.error(e);
    }
})

const t3and30d = new Scenes.BaseScene("t3and30d");
t3and30d.enter(async ctx => {
    try {
        await ctx.reply('Введите сумму:')
    } catch (e) {
        console.error(e);
    }
});

t3and30d.on('text', async ctx => {
    try {
        const searchString = /[\_\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Введите сумму(число):');
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {t330: ctx.message.text}})
        await ctx.reply(`Изменено:\n\n${admdb.t330} -> ${ctx.message.text}`)
        return await ctx.scene.enter('getadmtar')
    } catch (e) {
        console.error(e);
    }
})


const getuserdb = new Scenes.BaseScene("getuserdb");
getuserdb.enter(async ctx => {
    try {
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {met: 'none'}})
        const dm = await ctx.reply('...', {reply_markup: {remove_keyboard: true}})
        await ctx.deleteMessage(dm.message_id)
        await ctx.reply('По чему будем искать?', {reply_markup: {inline_keyboard: [[Markup.button.callback('По username 🔍', 'byusn'), Markup.button.callback('По имени 🔍', 'byn')], [Markup.button.callback('Отмена 🔴', 'cancf')]]}})
    } catch (e) {
        console.error(e);
    }
});

getuserdb.on('text', async ctx => {
    try {
        if (ctx.message.text == 'Отменить поиск 🔴') {
            await ctx.reply('Отменено.', {reply_markup: {keyboard: [['Редактировать цены тарифов 📝', 'Управление пользователями 👤'],['Статистика 📈', 'История 🗂'], ['🏠 Назад на главное меню']], resize_keyboard: true}})
            return ctx.scene.leave('getuserdb')
        }
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        if (admdb.met == 'none') {
            return ctx.reply('Нажмите на одну из кнопок выше ⬆️')
        }
        if (admdb.met == 'byusn') {
            const text = ctx.message.text
            const searchString = /[\!\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,.\\\|\/\+\=]+/g;
            if (ctx.message.text.match(searchString)) return await ctx.reply('Введите данные как на приведенном примере выше ⬆️');
            if(text[0] != '@') return ctx.reply('Введите данные как на приведенном примере выше ⬆️')
            await ctx.reply('Поиск...', {reply_markup: {remove_keyboard: true}})
            const user = await collection.findOne({user_name: text})
            if(user == null) return ctx.reply('Пользователь не найден.')
            let newar = []
            await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {findedus: user.user_id}})
            if (user.paid.length == 0) return await ctx.reply(`Найден пользователь по запросу: ${text}\n\nИмя: ${user.user_fname}\nUsername: ${user.user_name}\nId: ${user.accountid}\nUser Id: ${user.user_id}\n\nБаланс: ${user.moneyc}₽`, {reply_markup: {inline_keyboard: [[Markup.button.callback('Изменить баланс пользователя 📝', 'editusmoneyc')], [Markup.button.callback('Назад ↩️', 'backtoadm')]]}})

            for (let i = 0; i < user.paid.length; i++) {
                await newar.push(`${i+1}: Bill ID - ${user.paid[i]}`)
            }
            const str = await newar.join('\n')
            return await ctx.reply(`Найден пользователь по запросу: ${text}\n\nИмя: ${user.user_fname}\nUsername: ${user.user_name}\nId: ${user.accountid}\nUser Id: ${user.user_id}\n\nБаланс: ${user.moneyc}₽\nПополнения(bill ids):\n${str}`, {reply_markup: {inline_keyboard: [[Markup.button.callback('Изменить баланс пользователя 📝', 'editusmoneyc')], [Markup.button.callback('Назад ↩️', 'backtoadm')]]}})
        } else {
            const text = ctx.message.text
            await ctx.reply('Поиск...', {reply_markup: {remove_keyboard: true}})
            const user = await collection.findOne({user_fname: text})
            if(user == null) return ctx.reply('Пользователь не найден.')
            let newar = []
            await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {findedus: user.user_id}})
            if (user.paid.length == 0) return await ctx.reply(`Найден пользователь по запросу: ${text}\n\nИмя: ${user.user_fname}\nUsername: ${user.user_name}\nId: ${user.accountid}\nUser Id: ${user.user_id}\n\nБаланс: ${user.moneyc}₽`, {reply_markup: {inline_keyboard: [[Markup.button.callback('Изменить баланс пользователя 📝', 'editusmoneyc')], [Markup.button.callback('Назад ↩️', 'backtoadm')]]}})

            for (let i = 0; i < user.paid.length; i++) {
                await newar.push(`${i+1}: Bill ID - ${user.paid[i]}`)
            }
            const str = await newar.join('\n')
            return await ctx.reply(`Найден пользователь по запросу: ${text}\n\nИмя: ${user.user_fname}\nUsername: ${user.user_name}\nId: ${user.accountid}\nUser Id: ${user.user_id}\n\nБаланс: ${user.moneyc}₽\nПополнения(bill ids):\n${str}`, {reply_markup: {inline_keyboard: [[Markup.button.callback('Изменить баланс пользователя 📝', 'editusmoneyc')], [Markup.button.callback('Назад ↩️', 'backtoadm')]]}})
        }
    } catch (e) {
        console.error(e);
    }
})

getuserdb.action('byusn', async ctx => {
    try {
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {met: 'byusn'}})
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id)
        await ctx.reply('Введите username(@myusername) пользователя:', {reply_markup: {keyboard: [['Отменить поиск 🔴']], resize_keyboard: true}})
        await ctx.answerCbQuery()
    } catch (e) {
        console.error(e);
    }
})

getuserdb.action('byn', async ctx => {
    try {
        await collection.findOneAndUpdate({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')}, {$set: {met: 'byn'}})
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id)
        await ctx.reply('Введите имя(Мое имя) пользователя:', {reply_markup: {keyboard: [['Отменить поиск 🔴']], resize_keyboard: true}})
        await ctx.answerCbQuery()
    } catch (e) {
        console.error(e);
    }
})

getuserdb.action('cancf', async ctx => {
    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id)
        await ctx.answerCbQuery()
        await ctx.reply('Отменено.', {reply_markup: {keyboard: [['Редактировать цены тарифов 📝', 'Управление пользователями 👤'],['Статистика 📈', 'История 🗂'], ['🏠 Назад на главное меню']],resize_keyboard: true}})
        await ctx.scene.leave('getuserdb')
    } catch (e) {
        console.error(e);
    }
})

getuserdb.action('backtoadm', async ctx => {
    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id)
        await ctx.answerCbQuery()
        await ctx.reply('Админ меню 🏠', {reply_markup: {keyboard: [['Редактировать цены тарифов 📝', 'Управление пользователями 👤'],['Статистика 📈', 'История 🗂'], ['🏠 Назад на главное меню']],resize_keyboard: true}})
        await ctx.scene.leave('getuserdb')
    } catch (e) {
        console.error(e);
    }
})

getuserdb.action('editusmoneyc', async ctx => {
    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id)
        await ctx.answerCbQuery()
        await ctx.scene.enter('getmoneyc')
    } catch (e) {
        console.error(e);
    }
})

const getmoneyc = new Scenes.BaseScene("getmoneyc");
getmoneyc.enter(async ctx => {
    try {
        await ctx.reply('Введите сумму:', {reply_markup: {keyboard: [['Отмена 🔴']], resize_keyboard: true}})
    } catch (e) {
        console.error(e);
    }
});

getmoneyc.on('text', async ctx => {
    try {
        if(ctx.message.text == 'Отмена 🔴') {
            ctx.reply('Отменено.', {reply_markup: {keyboard: [['Редактировать цены тарифов 📝', 'Управление пользователями 👤'],['Статистика 📈', 'История 🗂'], ['🏠 Назад на главное меню']], resize_keyboard: true}})
            return ctx.scene.leave('getmoneyc')
        }
        const searchString = /[\!\@\#\№\"\;\$\%\^\:\&\?\*\(\)\{\}\[\]\?\/\,\\\|\/\+\=\a-z\а-я]+/g;
        if (ctx.message.text.match(searchString)) return await ctx.reply('Введите сумму(числа):');
        const admdb = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        const userdb = await collection.findOneAndUpdate({user_id: admdb.findedus}, {$set: {moneyc: ctx.message.text}})
        await ctx.reply('Изменено ✅', {reply_markup: {keyboard: [['Редактировать цены тарифов 📝', 'Управление пользователями 👤'],['Статистика 📈', 'История 🗂'], ['🏠 Назад на главное меню']], resize_keyboard: true}})
        await ctx.scene.leave('getmoneyc')
    } catch (e) {
        console.error(e);
    }
})

const stage = new Scenes.Stage([moneytopup, getgroup, gettar, getdays, getstopchan, getstartchan, getadmtar, t1and7d, t1and14d, t1and30d, t2and7d, t2and14d, t2and30d, t3and7d, t3and14d, t3and30d, getuserdb, getmoneyc]);  
bot.use(session());
bot.use(stage.middleware());

bot.hears(['📰 Мой профиль'], async ctx => {
    try {
        const userDB = await collection.findOne({user_id: ctx.from.id})
        if(userDB.user_fname != ctx.from.first_name) await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {user_fname: ctx.from.first_name}})
        if(userDB.user_name != ctx.from.username) await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {user_name: `@${ctx.from.username}`}})
        if (userDB.value == "WAITING") return await ctx.reply('Вы ещё не закончили пополнение, вы можете отменить пополнение нажав на кнопку отмены.')
        return ctx.replyWithHTML(`📰 Ваш профиль\n├💰 Баланс: ${userDB.moneyc} руб.\n└🆔 ID: <code>${userDB.accountid}</code>\nПодпишись на наш <a href="${linkToChanel}">канал</a> и будь в курсе всех изменений.`);
    } catch (e) {
        console.error(e);
    }
});
bot.hears(['💳 Пополнить'], async ctx => {
    try {
        const userDB = await collection.findOne({user_id: ctx.from.id})
        if (userDB.value == "WAITING") return await ctx.reply('Вы ещё не закончили предыдушее пополнение, вы можете отменить пополнение нажав на кнопку отмены.')
        return ctx.scene.enter('moneytopup');
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['📖 Цены'], async ctx => {
    try {
        const userDB = await collection.findOne({user_id: ctx.from.id})
        if(userDB.user_fname != ctx.from.first_name) await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {user_fname: ctx.from.first_name}})
        if(userDB.user_name != ctx.from.username) await collection.findOneAndUpdate({user_id: ctx.from.id}, {$set: {user_name: `@${ctx.from.username}`}})
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')})
        if (userDB.value == "WAITING") return await ctx.reply('Вы ещё не закончили пополнение, вы можете отменить пополнение нажав на кнопку отмены.')
        return await ctx.reply(`🏦 Цены 🏦\nАвтопросмотры на все новые записи.\n\n👁‍🗨 Тариф - 1\nЦелевое количество просмотров: 2500 за день\nСкорость за час: +100 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t17} руб\n📗 14 дней - ${admDB.t114} руб\n📘 30 дней - ${admDB.t130} руб\n\n👁‍🗨 Тариф - 2\nЦелевое количество просмотров: 6000 за день\nСкорость за час: +250 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t27} руб\n📗 14 дней - ${admDB.t214} руб\n📘 30 дней - ${admDB.t230} руб\n\n👁‍🗨 Тариф - 3\nЦелевое количество просмотров: 12000 за день\nСкорость за час: +500 просмотров\nКол-во дней:\n📕 7 дней - ${admDB.t37} руб\n📗 14 дней - ${admDB.t314} руб\n📘 30 дней - ${admDB.t330} руб`);
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['🔴 Мои заказы'], async ctx => {
    try {
        const userDB = await collection.findOne({user_id: ctx.from.id})
        if (userDB.value == "WAITING") return await ctx.reply('Вы ещё не закончили пополнение, вы можете отменить пополнение нажав на кнопку отмены.')
        return await ctx.reply('🔴 Мои заказы.', Markup.keyboard([
            ['📋 Список заказов'],
            ['⏸ Приостановить', '▶️ Возобновить']
        ]).resize());
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['🛒 Заказать'], async ctx => {
    try {
        const userDB = await collection.findOne({user_id: ctx.from.id})
        if (userDB.value == "WAITING") return await ctx.reply('Вы ещё не закончили пополнение, вы можете отменить пополнение нажав на кнопку отмены.');
        return await ctx.scene.enter('getgroup');
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['📋 Список заказов'], async ctx => {
    try {
        const userDB = await collection.findOne({user_id: ctx.from.id})
        if (userDB.value == "WAITING") return await ctx.reply('Вы ещё не закончили пополнение, вы можете отменить пополнение нажав на кнопку отмены.');
        if (userDB.uorders.length == 0) return await ctx.reply('У вас нет активных заказов.')
        for (let i = 0; i < userDB.uorders.length; i++) {
            await ctx.reply(`Канал: @${userDB.uorders[i].chanel}\n\nId заказа: ${userDB.uorders[i].orid}`)
        }
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['⏸ Приостановить'], async ctx => {
    try {
        const userDB = await collection.findOne({user_id: ctx.from.id})
        if (userDB.value == "WAITING") return await ctx.reply('Вы ещё не закончили пополнение, вы можете отменить пополнение нажав на кнопку отмены.');
        await ctx.scene.enter('getstopchan')
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['▶️ Возобновить'], async ctx => {
    try {
        const userDB = await collection.findOne({user_id: ctx.from.id})
        if (userDB.value == "WAITING") return await ctx.reply('Вы ещё не закончили пополнение, вы можете отменить пополнение нажав на кнопку отмены.');
        await ctx.scene.enter('getstartchan')
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['Статистика 📈'], async ctx => {
    try {
        if(ctx.from.id != '1864491973') return await ctx.reply('Не достаточно прав.')
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')});
        await ctx.reply(`STATISTICS:\n\nОбщее количество пользователей: ${admDB.users}\nКоличество успешных пополнений: ${admDB.ordersc}\nКоличество заработанных денег за все время: ${admDB.moneyget}₽`)
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['История 🗂'], async ctx => {
    try {
        if(ctx.from.id != '1864491973') return await ctx.reply('Не достаточно прав.')
        const admDB = await collection.findOne({_id: ObjectId('63d3f7fc5477c3d84ca4ea6e')});
        let newarr = []
        let str;
        await ctx.reply('Получение данных...')
        if (admDB.orders.length == 0) return ctx.reply('В истории ничего не найдено.');
        for (let i = 0; i < admDB.orders.length; i++) {
            try {
                const us = await collection.findOne({paid: admDB.orders[i].billId})
                const dateString = admDB.orders[i].creationDateTime;
                const date = new Date(dateString);
                const dat = date.toString()

                await newarr.push(`➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖\n\nПополнение - ${i+1}\n\nПользователь: <a href="tg://user?id=${us.user_id}">${us.user_fname}</a>\nBillId: ${admDB.orders[i].billId}\nДата пополнения: ${dat}\nСумма пополнения: ${admDB.orders[i].amount.value}\nStatus: ${admDB.orders[i].status.value}\n\n`)
                str = await newarr.join('\n')
            } catch (e) {
                console.error(e);
            }
        }
        return await ctx.reply(`📃 История успешных пополнений:\n\n${str}`, {parse_mode: "HTML"})
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['🏠 Назад на главное меню'], async ctx => {
    try {
        return await ctx.reply('🏠 Главное меню', Markup.keyboard([
            ['📰 Мой профиль', '💳 Пополнить'],
            ['🛒 Заказать', '🔴 Мои заказы', '📖 Цены']
        ]).resize());
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['Редактировать цены тарифов 📝'], async ctx => {
    try {
        if(ctx.from.id != '1864491973') return await ctx.reply('Не достаточно прав.')
        return ctx.scene.enter('getadmtar')
    } catch (e) {
        console.error(e);
    }
});

bot.hears(['Управление пользователями 👤'], async ctx => {
    try {
        if(ctx.from.id != '1864491973') return await ctx.reply('Не достаточно прав.')
        return ctx.scene.enter('getuserdb')
    } catch (e) {
        console.error(e);
    }
});

bot.command('admin', async ctx => {
    try {
        if(ctx.from.id != '1864491973') return await ctx.reply('Не достаточно прав.')
        return await ctx.reply('Добро пожаловать в админку!', {reply_markup: {keyboard: [['Редактировать цены тарифов 📝', 'Управление пользователями 👤'],['Статистика 📈', 'История 🗂'], ['🏠 Назад на главное меню']], resize_keyboard: true}})  
    } catch (e) {
        console.error(e);
    }
})