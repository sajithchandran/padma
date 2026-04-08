import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '.prisma/client-core';
import { WebhookSignatureGuard } from '../../common/guards/webhook-signature.guard';
import { PrismaService } from '../../database/prisma.service';
import { AthmaWebhookHandlerService } from './athma-webhook-handler.service';

@Controller('webhooks')
export class AthmaWebhookController {
  private readonly logger = new Logger(AthmaWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly handlerService: AthmaWebhookHandlerService,
  ) {}

  @Post('athma')
  @UseGuards(WebhookSignatureGuard)
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Body() event: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const tenantId = event['tenant_id'] as string;

    const webhookEvent = await this.prisma.webhookEvent.create({
      data: {
        tenantId,
        source: 'athma',
        eventType: event['event_type'] as string,
        payload: event as Prisma.InputJsonValue,
        processed: false,
      },
    });

    this.handlerService
      .handle(webhookEvent.id, event as any)
      .catch((err: Error) => {
        this.logger.error(
          `AthmaWebhookHandlerService.handle failed for webhookEvent ${webhookEvent.id}: ${err.message}`,
          err.stack,
        );
      });

    return { received: true };
  }
}
