module.exports = {
  token:
    "YOUT-BOT TOKEN",
  prefix: "?",
  ownerID: "365212532912160768",
  SpotifyID: "321c535c35b4423a945c9a6df5c5be06",
  SpotifySecret: "1bc3fee6cfd743be843ef29047bfe46d",
  mongourl:
    "mongodb+srv://phonix:P9NvOagdU0Yu9Lri@cluster0.uyfnnxi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",

  embedColor: "#2f3136",
  node_source: "ytsearch",
  topgg: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJib3QiOiJ0cnVlIiwiaWQiOiIxMDg5NTA0NTc3NzM0MzExOTc2IiwiaWF0IjoiMTc2MDkxMzQ1NSJ9.Dv2HTx8Te7Ts61ti1QnshFpgB2LdpO1FuJIJ45x1Mck",
  links: {
    hosting: "https://artixcloud.app",
    website: "https://encryptdev.in/phonix.gg/",
    support: "https://discord.gg/AqmRKkUvhy",
    invite:
      "https://discord.com/oauth2/authorize?client_id=1459197661386375229",
    icon: "https://iili.io/f8rfzYP.gif",
    power: "Powered By Phonix HQ",
    vanity: "https://discord.gg/AqmRKkUvhy",
    guild: "1459126136402346082",

    voteuri: "https://top.gg/bot/1089504577734311976/vote",
  },

  Webhooks: {
    error:
      "https://discord.com/api/webhooks/1472300151535304768/LuAump3XwJ5u92qwXprr3bs2wWRZDvowQS1uct141C_YaF1JMYPnEVpqNLV1DZJwUbjZ",
    black:
      "https://ptb.discord.com/api/webhooks/1429455597669187664/BtpN7tP2CV_JoiAPv1IvyaHLQjlyZ2qvXCALzKSyB7hwb6ppGIxXBUO_njh0xLhtprVg",

    player_create:
      "https://discord.com/api/webhooks/1472299699225628703/SUrm1JBRqto-eMrrkx3zTURUBBEnlsCQl2QvUPopxuVC4cz72tFoV2xsVscnT1zlirLn",

    player_delete:
      "https://discord.com/api/webhooks/1472300033096548498/YVpJQCoaRecBEbId3Y37ET9TR4muUmru09ziW50vx9N9clEskqECx357PTRTSkrD74Fd",

    guild_join:
      "https://discord.com/api/webhooks/1472299023846080543/qn6mz2Odi1Zfd1-gvPIN2eWPlsDYTLDFyl-eXFhF3TZEzB7RBdrr9bsLU2_q2_2OUMNk",

    guild_leave:
      "https://discord.com/api/webhooks/1472299151344537784/dUXkWepNghlhKoaTnoryWa3ehg0N00mQaDxlk6kWrbdooXy7_psiC0aiOhNfkgQ95N73",

    cmdrun:
      "https://discord.com/api/webhooks/1472299495348900070/BjGdzudHPVnSVPlOxuCPq0y_9hZIZ0vq4x3wuh2ZZxhoaQyD_-8zyf_ST3clI4D7jW2D",
  },

  nodes: [
    {
      url: process.env.NODE_URL || "n3.nexcloud.in:2013",

      name: process.env.NODE_NAME || "phonix",

      auth: process.env.NODE_AUTH || "phonix",

      secure: parseBoolean(process.env.NODE_SECURE || "false"),
    },
  ],
};

function parseBoolean(value) {
  if (typeof value === "string") {
    value = value.trim().toLowerCase();
  }

  switch (value) {
    case true:
    case "true":
      return true;
    default:
      return false;
  }
}
