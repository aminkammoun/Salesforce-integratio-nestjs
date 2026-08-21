import { Test, TestingModule } from '@nestjs/testing';
import { NeondbService } from './neondb.service';

describe('NeondbService', () => {
  let service: NeondbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NeondbService],
    }).compile();

    service = module.get<NeondbService>(NeondbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
