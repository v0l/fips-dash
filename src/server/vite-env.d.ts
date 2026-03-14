interface ImportMetaEnv {
  readonly FIPS_CONTROL_SOCKET?: string
  readonly PORT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
