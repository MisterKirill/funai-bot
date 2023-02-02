const { Client } = require('discord.js')
const axios = require('axios').default
const config = require('./config')

const bot = new Client({
    intents: [
        'Guilds',
        'MessageContent',
        'GuildMessages'
    ]
})

function random(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1) + min)
}

async function generateMessage(text, wait_for_model = false) {
    return new Promise((resolve, reject) => {
        axios.post('https://api-inference.huggingface.co/models/' + config.HF_MODEL, {
            inputs: text,
            wait_for_model
        }, {
            headers: {
                Authorization: 'Bearer ' + config.HF_TOKEN
            }
        }).catch(err => {
            if(err.response.status == 503) {
                return resolve(-1)
            } else {
                return reject(err)
            }
        }).then(res => {
            if(res.status == 503) return resolve(-1)

            let result = res.data[0].generated_text

            if(!result) {
                console.log(res.data)
                return resolve(-2)
            }

            result = result.replace(text, '')
            result = result.replace(/^, /, '')
            result = result.replace(/^>/, '')
            result = result.replace(/^> /, '')

            resolve(result)
        })
    })
}

bot.on('ready', () => {
    console.log('Bot ready')
})

bot.on('messageCreate', async msg => {
    if(msg.author.bot) return
    if(msg.content == '') return

    if(msg.channelId == config.REPLY_CHANNEL) {
        let reply = await generateMessage(msg.content, false)

        switch(reply) {
            case -1:
                msg.reply('> Модель загружается, подождите примерно 30 секунд...')
                break

            case -2:
                msg.reply('> Произошла ошибка, попробуйте ещё раз')
                break

            default:
                msg.reply(reply)
        }
    } else if(msg.channelId == config.RANDOM_REPLY_CHANNEL) {
        if(random(0, 100) <= config.RANDOM_REPLY_CHANCE) {
            let reply = await generateMessage(msg.content, true)

            if(reply != -1 && reply != -2) {
                msg.channel.send(reply)
            }
        }
    }
})

bot.login(config.BOT_TOKEN)