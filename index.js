const { default: axios } = require("axios");
const { Bot, Keyboard, HttpError, GrammyError } = require("grammy");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const bot = new Bot(process.env.BOT_TOKEN);
const tgApi = "https://api.telegram.org/"; //POST

const PORT = process.env.PORT || 4000;

const app = express();

app.use(cors());

app.get("/api", (req, res) => res.json({ status: "working" }));

const categories = [
    { value: "Animals", text: "Животные" },
    { value: "Clothes", text: "Одежда" },
    { value: "Sports", text: "Спорт" },
    { value: "Colors", text: "Цвета" },
    { value: "Family", text: "Семья" },
    { value: "Food", text: "Еда" },
    { value: "Human", text: "Человек" },
    { value: "House", text: "Дом" },
    { value: "Technology", text: "Технологии" },
    { value: "Materials", text: "Материалы" },
    { value: "Business", text: "Бизнес" }
];

let players = [];//{ id, first_name, category, actionChangeCategory, word }

let text = `
<b>📌Китайский танк WZ-121📌</b>

Британское кодовое название для новейшей (на 1916 год) бронированной боевой машины, принятое в целях обеспечения секретности. Впоследствии стало общепринятым для данного класса машин. 

<u>Информация взята с воздуха</u>

<a href="https://fonwall.ru/search/?order=new&q=игры">👇Источник👇</a>
`;

bot.command("speak", async (ctx) => {
    try {
        let req = `${tgApi}bot${process.env.BOT_TOKEN}/sendMessage?chat_id=-4098814280&text=${text}&parse_mode=HTML`
        let photo = `${tgApi}bot${process.env.BOT_TOKEN}/sendPhoto`;
        await axios.post(photo, {
            chat_id: "-4098814280",
            photo: "https://img3.fonwall.ru/o/ss/vehicle-weapon-tank-world-of-tanks-vnyu.jpeg?auto=compress&fit=resize&w=500&display=thumb",
            caption: text,
            parse_mode: "HTML"
        });
        // await ctx.reply("hear")
    } catch (e) {
        console.log(e);
    }

});

bot.command("start", async (ctx) => {
    await ctx.reply('Привет, ты можешь испытать игру, для этого напиши комманду "/game"');
});

//start game
bot.command("game", async (ctx) => {
    const { id, first_name } = ctx.message.from;
    const keybd = await generateCategoryKeybd();
    players.push({ id, first_name, actionChangeCategory: true });
    await ctx.reply(`${first_name} выбери категорию слова, которое хочешь перевести`, { reply_markup: keybd });
});

//set category words
bot.command("category", async (ctx) => {
    const { id, first_name } = ctx.message.from;
    
    //check user
    const reqUser = players.find(el => el.id === id);
    if (!reqUser) return await ctx.reply(`${first_name} для выбора категории слова, необходимо сначала начать игру`);

    const keybd = await generateCategoryKeybd();

    players = players.map(el => {
        if (el.id !== id) return el;
        return { ...el, actionChangeCategory: true }
    });

    await ctx.reply(`${first_name} выбери категорию слова, которое хочешь перевести`, { reply_markup: keybd });
});

//send category value
bot.hears(categories.map(el => el.text), async (ctx) => {
    const { id, first_name } = ctx.message.from;

    //check user
    const reqUser = players.find(el => el.id === id);
    if (!reqUser) return await ctx.reply(`${first_name} для выбора категории слова, необходимо сначала начать игру`);

    if (reqUser.actionChangeCategory) {
        let findedCategory = categories.find(el => el.text === ctx.message.text);
        players = players.map(el => {
            if (el.id !== id) return el;
            return { ...el, category: findedCategory, actionChangeCategory: false }
        });
        await ctx.reply("Категория выбрана, ожидайте появления слов для перевода");
        await getWord(ctx);
    }

});

//handle answer and send request on new random word
bot.on("msg", async (ctx) => {

    const { id, first_name } = ctx.message.from;
    const reqUser = players.find(el => el.id === id);
    if (!reqUser) return;

    //check empty category
    if (!reqUser.category) return await ctx.reply(`${first_name} для начала игры, необходимо выбрать категорию`);

    //check loaded word
    if (!reqUser.word) return;

    if (ctx.message.text.toLowerCase().trim() === reqUser.word.translation.toLowerCase().trim()) {
        await ctx.reply("Вы перевели правильно :)");
    } else {
        await ctx.reply("К сожалению вы проебались в переводе :(");
    }

    await ctx.reply("Скоро появится новое слово...");
    await getWord(ctx);
    
});

//handle bot errors
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
});

//game - choose category - question - cancel - change category

async function generateCategoryKeybd() {
    const categoryKeybd = await new Keyboard()
    .text("Животные").text("Одежда").text("Спорт").row()
    .text("Цвета").text("Семья").text("Еда").row()
    .text("Человек").text("Дом").text("Технологии").row()
    .text("Материалы").text("Бизнес").row().resized().oneTime();
    return categoryKeybd;
}

async function getWord(ctx) {
    let user = players.find(el => ctx.message.from.id === el.id);
    const { data } = await axios.get(`${process.env.API_PATH}?category=${user.category.value}`);

    //save random word to user
    players = players.map(el => {
        if (el.id !== ctx.message.from.id) return el;
        return { ...el, word: data };
    });

    await ctx.reply(`Какой перевод слова *${data.word}*?`);
}

bot.start();
app.listen(PORT, () => console.log("Server launch"));

// {
//     message_id: 35,
//     from: {
//       id: 5687791980,
//       is_bot: false,
//       first_name: 'Матвей',
//       username: 'RedisKa_00',
//       language_code: 'ru'
//     },
//     chat: {
//       id: -4098814280,
//       title: 'Танки нах',
//       type: 'group',
//       all_members_are_administrators: true
//     },
//     date: 1711885685,
//     text: 'esf'
//   }