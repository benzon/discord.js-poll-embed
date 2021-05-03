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
	if (!msg && !msg.channel) return msg.reply(i18n.__('Channel is inaccessible.'));
	if (!title) return msg.reply(i18n.__('Poll title is not given.'));
	if (!options) return msg.reply(i18n.__('Poll options are not given.'));
	if (options.length < 2) return msg.reply(i18n.__('Please provide more than one choice.'));
	if (options.length > emojiList.length) return msg.reply(i18n.__('Please provide %s or less choices.', emojiList.length));

	let usedEmojiList = emojiList.slice();
	let text = i18n.__('*To vote, react using the correspoding emoji.\nThe voting will end in **%s seconds**.\nPoll creater can end the poll **forcefully** by reacting to %s emoji.*\n\n', timeout, forceEndPollEmoji);
	
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
		var poll = await msg.channel.send(embedBuilder(title, msg.author.tag).setDescription(i18n.__('Is being created wait a moment...'))).catch(function (e) { });
	} else {
		var poll = await channel.send(embedBuilder(title, msg.author.tag).setDescription(i18n.__('Is being created wait a moment...'))).catch(function (e) { });
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
		text = i18n.__('*Poll result*\n\n');
		for (const emoji in emojiInfo) {
			text += `\`${emojiInfo[emoji].option}\` - \`${emojiInfo[emoji].votes}\`\n\n`
			total = total + emojiInfo[emoji].votes;
		}
		text += i18n.__('Votes cast: %s\n\n', total)
		poll.delete().catch(function (e) {
			post[0] = 0
		});

		if (!channel && post[0] === 1) {
			msg.channel.send(embedBuilder(title, msg.author.tag).setDescription(text)).catch(function (e) { });
		} else if (post[0] === 1) {
			channel.send(embedBuilder(title, msg.author.tag).setDescription(text)).catch(function (e) { });
		}
	});
};

const embedBuilder = (title, author) => {
	return new MessageEmbed()
		.setTitle(i18n.__('Poll - %s', title))
		.setFooter(i18n.__('Poll created by %s', author));
};

module.exports = pollEmbed;
