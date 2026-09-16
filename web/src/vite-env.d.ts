/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TAMIX_API_URL: string;
  readonly VITE_STUDIO_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
