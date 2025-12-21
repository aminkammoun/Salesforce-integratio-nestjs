import { Body, Controller, Post } from '@nestjs/common';
import { ErrorsService } from '../service/errors.service';
import { ErrorsDto } from '../dto/create-errors.dto';
@Controller('errors')
export class ErrorsController {
    constructor(private readonly ErrorsService: ErrorsService) { }

    @Post('/log')
    async logError(@Body() body: ErrorsDto) {
        // Logic to log an error
        return this.ErrorsService.logError(body);
    }
}
