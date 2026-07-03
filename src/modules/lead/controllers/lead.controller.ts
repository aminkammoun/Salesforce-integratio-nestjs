import { Body, Controller, Param, Post, Get } from '@nestjs/common';
import { LeadService } from '../services/lead.service';
@Controller('lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) { }
  @Post("/create")
  async createLead(@Body() leadData: any) {
    return this.leadService.createLead(leadData)
  }
  @Get("/getLeads/:event_id")
  async getNumberOfLeads(@Param('event_id') event_id: string) {
    return this.leadService.getNumberOfLeads(event_id)
  }
}
