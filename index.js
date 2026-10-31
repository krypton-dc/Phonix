const launcher = async () => {
  require("dotenv").config();
  require("module-alias/register");
  require("@main/Shard.js");
};
launcher();
