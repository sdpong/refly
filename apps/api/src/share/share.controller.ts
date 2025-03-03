import { Body, Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import { ShareService } from '@/share/share.service';
import {
  User,
  CreateShareRequest,
  DeleteShareRequest,
  CreateShareResponse,
  EntityType,
  ListShareResponse,
} from '@refly-packages/openapi-schema';
import { JwtAuthGuard } from '@/auth/guard/jwt-auth.guard';
import { LoginedUser } from '@/utils/decorators/user.decorator';
import { buildSuccessResponse } from '@/utils';
import { shareRecordPO2DTO } from '@/share/share.dto';

@Controller('v1/share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @UseGuards(JwtAuthGuard)
  @Get('list')
  async listShares(
    @LoginedUser() user: User,
    @Query('shareId') shareId: string,
    @Query('entityId') entityId: string,
    @Query('entityType') entityType: EntityType,
  ): Promise<ListShareResponse> {
    const result = await this.shareService.listShares(user, { shareId, entityId, entityType });
    return buildSuccessResponse(result.map(shareRecordPO2DTO));
  }

  @UseGuards(JwtAuthGuard)
  @Post('new')
  async createShare(
    @LoginedUser() user: User,
    @Body() body: CreateShareRequest,
  ): Promise<CreateShareResponse> {
    const result = await this.shareService.createShare(user, body);
    return buildSuccessResponse({ shareId: result.shareId });
  }

  @UseGuards(JwtAuthGuard)
  @Post('delete')
  async deleteShare(@LoginedUser() user: User, @Body() body: DeleteShareRequest) {
    await this.shareService.deleteShare(user, body);
    return buildSuccessResponse(null);
  }
}
