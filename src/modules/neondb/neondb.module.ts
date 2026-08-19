import { Module } from '@nestjs/common';
import { NeondbController } from './controller/neondb.controller';
import { NeondbService } from './service/neondb.service';
import { NeonDatabaseModule } from 'src/config/neon.config';

@Module({
    imports: [NeonDatabaseModule],
    controllers: [NeondbController],
    providers: [NeondbService],
    exports: [ NeonDatabaseModule, NeondbService]
})
export class NeondbModule { }
