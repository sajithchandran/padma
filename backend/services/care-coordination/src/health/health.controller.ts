import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Service health check' })
  check() {
    return {
      status: 'ok',
      service: 'padma-care-coordination',
      timestamp: new Date().toISOString(),
    };
  }
}
