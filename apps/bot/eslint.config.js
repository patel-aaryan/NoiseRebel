import globals from "globals"

import { config } from "@noise-rebel/eslint-config/base"

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]
