export interface WiltConfig {
  /** Directory where generated modules are placed. Default: "src/modules/app" */
  modulesDir?: string;
  /** Source directory. Default: "src" */
  srcDir?: string;
  /** Defaults applied when running `wilt generate module` */
  generate?: {
    files?: Array<"module" | "controller" | "service" | "dto" | "entity" | "test">;
  };
}

export function defineConfig(config: WiltConfig): WiltConfig {
  return config;
}
