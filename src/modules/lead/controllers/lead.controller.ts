import { Body, Controller, Post } from '@nestjs/common';
import { LeadService } from '../services/lead.service';
@Controller('lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}
  @Post("/create")
  async createLead(@Body() leadData: any) {
    return this.leadService.createLead(leadData)
  }
}
