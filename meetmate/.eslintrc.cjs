module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "prettier"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: "latest",
    sourceType: "module"
  },
  env: {
    es2021: true,
    node: true,
    jest: true
  },
  plugins: ["@typescript-eslint", "react", "react-hooks", "jsx-a11y", "prettier"],
  settings: {
    react: {
      version: "detect"
    },
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"]
      }
    }
  },
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-var-requires": "off",
    "jsx-a11y/no-autofocus": "off",
    "react/prop-types": "off",
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off"
  },
  overrides: [
    {
      files: ["*.js", "*.jsx"],
      rules: {
        "@typescript-eslint/explicit-function-return-type": "off"
      }
    },
    {
      files: ["**/__tests__/**", "e2e/**/*.ts", "scripts/**/*.ts"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-unused-vars": "off"
      }
    }
  ]
};
