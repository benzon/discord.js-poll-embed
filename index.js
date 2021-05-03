const { MessageEmbed } = require('discord.js');
const i18n = require('i18n');

const defEmojiList = [
	'\u0031\u20E3',
	'\u0032\u20E3',
	'\u0033\u20E3',
	'\u0034\u20E3',
	'\u0035\u20E3',
	'\u0036\u20E3',
	'\u0037\u20E3',
	'\u0038\u20E3',
	'\u0039\u20E3',
	'\uD83D\uDD1F'
];

const pollEmbed = async (channel, msg, title, options, timeout = 30, emojiList = defEmojiList, forceEndPollEmoji = '\u2705') => {
	if (!msg && !msg.channel) return msg.reply('Har ikke adgang til at skrive i kanalen.');
	if (!title) return msg.reply('Der er ikke angivet en titel på afstemningen.');
	if (!options) return msg.reply('Der er ikke oprettet nogle svar muligheder.');
	if (options.length < 2) return msg.reply('Du skal angive minimum 2 svar muligheder.');
	if (options.length > emojiList.length) return msg.reply(`Du har oprettet for mange spørgsmål du kan max have ${emojiList.length}.`);

	let usedEmojiList = emojiList.slice();
	let text = `*For at stemme tryk på den tilsvarende emoji.\nAfstemningen slutter om **${timeout} sekunder**.\nPersonen der har oprettet poll'en kan afslutte den ved at reagere med ${forceEndPollEmoji} emojien.*\n\n`;
	const emojiInfo = {};
	const post = {}
	for (const option of options) {
		const emoji = usedEmojiList.splice(0, 1);
		emojiInfo[emoji] = { option: option, votes: 0 };
		text += `${emoji} : \`${option}\`\n\n`;
	}
	const usedEmojis = Object.keys(emojiInfo);
	usedEmojis.push(forceEndPollEmoji);

	if (!channel) {
		var poll = await msg.channel.send(embedBuilder('Afstemningen', msg.author.tag).setDescription('Er ved at blive klargjort vent venligst...')).catch(function (e) { });
	} else {
		var poll = await channel.send(embedBuilder('Afstemningen', msg.author.tag).setDescription('Er ved at blive klargjort vent venligst...')).catch(function (e) { });
	}
	for (const emoji of usedEmojis) await poll.react(emoji).catch(function (e) { });
	poll = await poll.edit(embedBuilder(title, msg.author.tag).setDescription(text)).catch(function (e) { });

	const reactionCollector = await poll.createReactionCollector(
		(reaction, user) => usedEmojis.includes(reaction.emoji.name) && !user.bot,
		timeout === 0 ? {} : { time: timeout * 1000 }
	);
	const voterInfo = new Map();
	reactionCollector.on('collect', (reaction, user) => {
		if (usedEmojis.includes(reaction.emoji.name)) {
			if (reaction.emoji.name === forceEndPollEmoji && msg.author.id === user.id) return reactionCollector.stop();
			if (!voterInfo.has(user.id)) voterInfo.set(user.id, { emoji: reaction.emoji.name });
			const votedEmoji = voterInfo.get(user.id).emoji;
			reaction.users.remove(user.id).catch(function (e) { });
			if (votedEmoji !== reaction.emoji.name) {
				const lastVote = poll.reactions.resolve(votedEmoji).catch(function (e) { });
				lastVote.count -= 1;
				lastVote.users.remove(user.id).catch(function (e) { });
				emojiInfo[votedEmoji].votes -= 1;
				voterInfo.set(user.id, { emoji: reaction.emoji.name });
			}
			emojiInfo[reaction.emoji.name].votes += 1;
		}
	});

	reactionCollector.on('dispose', (reaction, user) => {
		if (usedEmojis.includes(reaction.emoji.name)) {
			voterInfo.delete(user.id).catch(function (e) { });
			emojiInfo[reaction.emoji.name].votes -= 1;
		}
	});

	reactionCollector.on('end', () => {
		var total = 0
		post[0] = 1
		text = '*Resultat af afstemningen*\n\n';
		for (const emoji in emojiInfo) {
			text += `\`${emojiInfo[emoji].option}\` - \`${emojiInfo[emoji].votes}\`\n\n`
			total = total + emojiInfo[emoji].votes;
		}
		text += `Stemmer afgivet: ${total}\n\n`
		poll.delete().catch(function (e) {
			post[0] = 0
		});

		if (!channel && post === 1) {
			msg.channel.send(embedBuilder(title, msg.author.tag).setDescription(text)).catch(function (e) { });
		} else if (post === 1) {
			channel.send(embedBuilder(title, msg.author.tag).setDescription(text)).catch(function (e) { });
		}
	});
};

const embedBuilder = (title, author) => {
	return new MessageEmbed()
		.setTitle(`Poll - ${title}`)
		.setFooter(`Poll oprettet af ${author}`);
};

module.exports = pollEmbed;
