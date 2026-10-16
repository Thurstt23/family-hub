import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Flat config built from the plugins directly. eslint-config-next 15 only
// ships eslintrc-style configs, which ESLint 9 cannot load on their own.
export default tseslint.config(
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**", "load/**"],
  },
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": nextPlugin, "react-hooks": reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
      // `any` is used deliberately at the untyped Supabase and Stripe
      // boundaries from earlier phases. Visible as warnings, not failures.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
