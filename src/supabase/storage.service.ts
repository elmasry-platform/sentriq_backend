import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/env';

/** Signs storage links with the END USER's token (storage RLS applies). No service key. */
@Injectable()
export class StorageService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async signedDownloadUrl(bucket: string, path: string, expiresIn: number, token: string): Promise<string> {
    const res = await fetch(`${this.config.supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST',
      headers: { apikey: this.config.supabaseAnonKey, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ expiresIn }),
    });
    if (!res.ok) throw new Error(`storage_sign_${res.status}`);
    const body = (await res.json()) as { signedURL?: string };
    if (!body.signedURL) throw new Error('storage_sign_empty');
    return `${this.config.supabaseUrl}/storage/v1${body.signedURL}`;
  }
}
