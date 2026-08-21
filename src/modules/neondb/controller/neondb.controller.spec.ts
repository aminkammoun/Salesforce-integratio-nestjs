import { Test, TestingModule } from '@nestjs/testing';
import { NeondbController } from './neondb.controller';

describe('NeondbController', () => {
  let controller: NeondbController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NeondbController],
    }).compile();

    controller = module.get<NeondbController>(NeondbController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
