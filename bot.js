const fetch = require("node-fetch");
const Discord = require("discord.js");

const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

const botToken = process.env.DankMemeBotToken;
if (!botToken) {
  return;
}

const supportedMessageBoards = new Map([
  ["4chan", "https://a.4cdn.org/boards.json"],
  ["7chan"],
  ["lainchan"],
]);

const catalogLinksMap = new Map([
  ["4chan", "https://a.4cdn.org/{chosen-board}/catalog.json"],
]);

const cdnMap = new Map([["4chan", "https://i.4cdn.org/"]]);
const contentApiMap = new Map([["4chan", "https://a.4cdn.org/"]]);

client.on("ready", () => {
  console.log("Connected as " + client.user.tag);
});

client.login(botToken);

//Client commands
client.on("message", async (receivedMessage) => {
  if (receivedMessage.content.substring(0, 1) == "!") {
    var args = receivedMessage.content.substring(1).split(" ");
    var cmd = args[0];
    args = args.splice(1);

    switch (cmd) {
      case "ping":
        receivedMessage.channel.send(
          "Hi, I'm DankMemeBot. It's a pleasure to meet you. Type \"!commands to learn more about what I can do"
        );
        break;
      case "info":
        receivedMessage.channel.send(
          "I specialize in pulling info from message boards. Currently I support: " +
            [...supportedMessageBoards.keys()].join(", ") +
            "\n" +
            "Here are my commands: \n" +
            "!ping - General introduction from the bot \n" +
            "!command - Command menu \n" +
            "!boards - Get current list of supported message boards \n" +
            "!board <chosen board> - Get list of categories in message board (i.e: wsg, cooking, cyb) \n" +
            "!board <chosen board> <chosen category> - Get a list of all active threads in chosen category \n"
        );
        break;
      case "boards":
        let boardsList = [...supportedMessageBoards.keys()].join(", ");
        receivedMessage.channel.send(
          "Currently supported message boards: " + boardsList
        );
        break;
      case "board":
        if (args.length > 1) {
          console.log("fetching threads");
          let selectedBoard = args[0];
          let board = args[1];
          let threadList = await fetchCatalog(selectedBoard, board);

          receivedMessage.channel.send(
            selectedBoard +
              " is the board you selected, getting threads from: " +
              board +
              "use the '👌' to get media from a thread \n" +
              "Media only available for a minute. If it doesn't download, reinput command"
          );

          threadList.map((thread) => receivedMessage.channel.send(thread));
        } else {
          console.log("fetching boards");
          let selectedBoard = args[0];
          let fetchedBoards = await fetchBoards(selectedBoard);
          receivedMessage.channel.send(
            "You want to go to " +
              selectedBoard +
              ". Available boards are: \n" +
              fetchedBoards
          );
        }
        break;
      default:
        receivedMessage.channel.send(
          "The booty verse accepts many things, but not that command"
        );
        break;
    }
  }

  let authorId = client.user.id;

  const filter = (reaction, user) => {
    return (
      ["👌"].includes(reaction.emoji.name) &&
      receivedMessage.author.id === authorId
    );
  };

  receivedMessage
    .awaitReactions(filter, { max: 1, time: 60000, errors: ["time"] })
    .then((collected) => {
      console.log("Reaction logged here");
      const reaction = collected.first();
      console.log("Reaction name is: " + reaction.emoji.name);

      let chosenThreadMessage = receivedMessage.content.split(",")[1];
      let chosenThread = chosenThreadMessage.split(":");
      console.log("Chosen Board: " + chosenThread[0]);
      console.log("Chosen Thread: " + chosenThread[1]);
      console.log("Chosen Forum: " + chosenThread[2]);

      let board = chosenThread[0].trim().toLowerCase();
      let thread = chosenThread[1];
      let forum = chosenThread[2];

      fetchContent(board, thread, forum).then((content) =>
        content.map((post) => receivedMessage.channel.send(post))
      );
    })
    .catch((collected) => {
      //console.log("Not applicable reaction");
    });
});

async function fetchBoards(messageBoard) {
  switch (messageBoard) {
    case "4chan":
      let result = await fetch(supportedMessageBoards.get(messageBoard));
      let data = await result.json();
      let newBoards = data.boards
        .map((board) => board.title + "=>" + board.board)
        .join(",\n");
      return newBoards;
    default:
      return "No boards available for " + messageBoard;
  }
}

async function fetchCatalog(messageBoard, chosenBoard) {
  switch (messageBoard) {
    case "4chan":
      let catalogUrl = catalogLinksMap
        .get(messageBoard)
        .replace("{chosen-board}", chosenBoard);
      let result = await fetch(catalogUrl);
      let data = await result.json();
      let threadList = data
        .filter((element) => element.page === 1 || element.page === 2)
        .map((page) => page.threads)
        .flat();
      console.log("Thread list content: " + Object.keys(threadList[0]));
      let threadTitles = threadList
        .filter((thread) => thread.sub)
        .filter((thread) => !thread.sticky)
        .map(
          (thread) =>
            thread.sub.replace(",", " ") +
            ": " +
            "Replies [" +
            thread.replies +
            "]" +
            ", " +
            chosenBoard.toUpperCase() +
            ":" +
            thread.no +
            ":" +
            "4chan"
        );
      return threadTitles;
  }
}

async function fetchContent(board, thread, forum) {
  let cdn = cdnMap.get(forum);
  let contentApiUrl = contentApiMap.get(forum);
  let url = contentApiUrl + board + "/thread/" + thread + ".json";

  let contentResult = await fetch(url);

  let contentJson = await contentResult.json();

  let content = contentJson.posts
    .filter((post) => post.ext)
    .map((post) => cdn + board + "/" + post.tim + post.ext);

  return content;
}
