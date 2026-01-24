import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PartnerLeadsService } from "./partner-leads.service";
import { CreatePartnerLeadDto } from "./dto/create-partner-lead.dto";

@ApiTags("partner-leads")
@Controller("v1")
export class PartnerLeadsController {
  constructor(private readonly partnerLeadsService: PartnerLeadsService) {}

  @Post("partner-leads")
  async createLead(@Body() body: CreatePartnerLeadDto) {
    return this.partnerLeadsService.createLead(body);
  }
}
