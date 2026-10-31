const { Kazagumo, Plugins, KazagumoTrack } = require("kazagumo");
const { Connectors, LoadType } = require("shoukaku");
const Spotify = require("kazagumo-spotify");

const searchEngines = {
  DEEZER: "dzsearch",
  SPOTIFY: "spsearch",
  YOUTUBE: "ytsearch",
  JIO_SAAVAN: "jssearch",
  SOUNDCLOUD: "scsearch",
  YOUTUBE_MUSIC: "ytmsearch",
};

module.exports = function loadPlayerManager(client) {
  const manager = new Kazagumo(
    {
      defaultSearchEngine: client.config.node_source,
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      },
    },
    new Connectors.DiscordJS(client),
    client.config.nodes,
    client.config.node_options
  );

  // Attach the searchEngines enum to manager
  manager.searchEngines = searchEngines;

  // Also manually store the default search engine
  manager.defaultSearchEngine = client.config.node_source;

  // Override the search method
  manager.search = async function (query, options = {}) {
    const prefix = options.engine || this.defaultSearchEngine;

    const node = [...this.shoukaku.nodes.values()][0];
    if (!node) return { type: "SEARCH", tracks: [] };

    const isUrl = /^https?:\/\//.test(query);

    const searchQuery = isUrl ? query : `${prefix}:${query}`;

    const res = await node.rest.resolve(searchQuery).catch(() => null);

    if (!res) return { type: "SEARCH", tracks: [] };

    switch (res.loadType) {
      case LoadType.TRACK:
        return {
          type: "TRACK",
          tracks: [new KazagumoTrack(res.data, options.requester)],
        };
      case LoadType.PLAYLIST:
        return {
          type: "PLAYLIST",
          playlistName: res.data.info.name,
          tracks: res.data.tracks.map(
            (track) => new KazagumoTrack(track, options.requester)
          ),
        };
      case LoadType.SEARCH:
        return {
          type: "SEARCH",
          tracks: res.data.map(
            (track) => new KazagumoTrack(track, options.requester)
          ),
        };
      default:
        return { type: "SEARCH", tracks: [] };
    }
  };

  client.manager = manager;
  return manager;
};
