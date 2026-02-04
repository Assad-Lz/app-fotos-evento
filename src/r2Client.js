import { S3Client } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_KEY,
  },
  // Estas configurações abaixo impedem o SDK de tentar usar
  // funções de "stream" que não existem no navegador
  sha256: undefined,
  apiVersion: '2006-03-01',
});

export const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
