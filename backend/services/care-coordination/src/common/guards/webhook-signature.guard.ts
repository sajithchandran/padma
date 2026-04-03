import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-signature-256'] as string;
    const timestamp = request.headers['x-webhook-timestamp'] as string;

    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    // Reject webhooks older than 5 minutes (replay attack prevention)
    if (timestamp) {
      const webhookTime = new Date(timestamp).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      if (Math.abs(now - webhookTime) > fiveMinutes) {
        throw new UnauthorizedException('Webhook timestamp expired');
      }
    }

    const source = request.params?.source || 'athma';
    const secret = this.getSecretForSource(source);

    if (!secret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const rawBody = request.rawBody || JSON.stringify(request.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }

  private getSecretForSource(source: string): string {
    const secrets: Record<string, string> = {
      athma: this.configService.get<string>('integration.athma.webhookSecret') || '',
    };
    return secrets[source] || '';
  }
}
