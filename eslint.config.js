import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**", "base44/.types/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node, Deno: "readonly" },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^React$", argsIgnorePattern: "^_" }],
      "no-undef": "error",
    },
  },
  { files: ["src/**/*.{jsx,js}"], rules: { "no-unused-vars": "off" } },
  { files: ["base44/functions/**/*.js"], rules: { "no-control-regex": "off" } },
  { files: ["scripts/**/*.mjs"], languageOptions: { globals: globals.node } },
];
