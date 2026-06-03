import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Patch,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrganizationsService } from './organizations.service';
import { InvitationsService } from './invitations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ListOrganizationsDto } from './dto/list-organizations.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';

@ApiTags('سازمان‌ها')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private orgsService: OrganizationsService,
    private invitationsService: InvitationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'لیست سازمان‌ها (با صفحه‌بندی و فیلتر)' })
  findAll(@Query() query: ListOrganizationsDto, @Request() req: any) {
    return this.orgsService.findAll(req.user.id, query);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'ایجاد سازمان جدید' })
  create(@Body() dto: CreateOrganizationDto, @Request() req: any) {
    return this.orgsService.create(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات سازمان بر اساس ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.orgsService.findOne(id, req.user.id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'جزئیات سازمان بر اساس slug' })
  findBySlug(@Param('slug') slug: string, @Request() req: any) {
    return this.orgsService.findBySlug(slug, req.user.id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'ویرایش سازمان' })
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto, @Request() req: any) {
    return this.orgsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف (غیرفعال‌سازی) سازمان' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.orgsService.remove(id, req.user.id);
  }

  @Get(':id/members')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'لیست اعضای سازمان' })
  getMembers(@Param('id') id: string, @Request() req: any) {
    return this.orgsService.getMembers(id, req.user.id);
  }

  @Delete(':id/members/:memberId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف عضو از سازمان' })
  removeMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ) {
    return this.orgsService.removeMember(orgId, memberId, req.user.id);
  }

  @Patch(':id/members/:memberId/suspend')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'تعلیق حساب کاربری عضو' })
  suspendMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ) {
    return this.orgsService.suspendMember(orgId, memberId, req.user.id);
  }

  @Patch(':id/members/:memberId/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'فعال‌سازی مجدد حساب کاربری عضو' })
  activateMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ) {
    return this.orgsService.activateMember(orgId, memberId, req.user.id);
  }

  @Patch(':id/members/:memberId/role')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'تغییر نقش عضو' })
  updateMemberRole(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Request() req: any,
  ) {
    return this.orgsService.updateMemberRole(orgId, memberId, req.user.id, dto);
  }

  @Patch(':id/members/:memberId/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'تغییر وضعیت عضو (تعلیق/فعال‌سازی)' })
  updateMemberStatus(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberStatusDto,
    @Request() req: any,
  ) {
    return this.orgsService.updateMemberStatus(orgId, memberId, req.user.id, dto);
  }

  // Invitation Endpoints

  @Post(':id/invite')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'دعوت عضو جدید از طریق ایمیل' })
  inviteMember(
    @Param('id') orgId: string,
    @Body() dto: InviteMemberDto,
    @Request() req: any,
  ) {
    return this.invitationsService.inviteMember(
      orgId,
      req.user.id,
      dto.email,
      dto.role,
    );
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'پذیرش دعوت‌نامه' })
  acceptInvitation(@Body() dto: AcceptInvitationDto, @Request() req: any) {
    return this.invitationsService.acceptInvitation(dto.token, req.user.id);
  }

  @Get(':id/invitations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'لیست دعوت‌نامه‌های معلق' })
  listInvitations(@Param('id') orgId: string, @Request() req: any) {
    return this.invitationsService.listPendingInvitations(orgId, req.user.id);
  }

  @Delete(':id/invitations/:invitationId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'لغو دعوت‌نامه' })
  revokeInvitation(
    @Param('id') orgId: string,
    @Param('invitationId') invitationId: string,
    @Request() req: any,
  ) {
    return this.invitationsService.revokeInvitation(orgId, invitationId, req.user.id);
  }
}
