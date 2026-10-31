import pluginJs from "@eslint/js";
import globals from "globals";

export default [
  pluginJs.configs.recommended,
  {
    files: ["src/**/*.js", "**/*.js"],
    ignores: [".github/*", "node_modules", "storage", "lavalink"],
    languageOptions: {
      sourceType: "commonjs",
      ecmaVersion: "latest",
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
    },
    rules: {
      "handle-callback-err": "off",
      "max-nested-callbacks": ["error", { max: 4 }],
      "no-console": "off",
      "no-empty-function": "off",
      "no-lonely-if": "error",
      "no-shadow": ["error", { allow: ["err", "resolve", "reject"] }],
      "no-unexpected-multiline": "off",
      "no-var": "error",
      "no-unused-vars": "off",
      "prefer-const": "error",
      "spaced-comment": "error",
      yoda: "error",
    },
  },
];
