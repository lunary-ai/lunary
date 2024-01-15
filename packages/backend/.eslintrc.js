const dotenv = require("dotenv")
dotenv.config()

module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "@ts-safeql/eslint-plugin"],
  rules: {
    "@ts-safeql/check-sql": [
      "error",
      {
        connections: {
          databaseUrl: process.env.DB_URI,
          targets: [{ tag: "sql" }],
        },
      },
    ],
  },
}
