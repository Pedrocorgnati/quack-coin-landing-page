import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["**/tests/**/*.test.ts"],
  collectCoverageFrom: [
    "lib/**/*.ts",
    "!lib/generated/**",
    "!lib/**/*.d.ts",
    "!lib/seeds/**",
  ],
  coverageThreshold: {
    global: {
      lines: 60,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "node",
        },
      },
    ],
  },
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
};

export default config;
