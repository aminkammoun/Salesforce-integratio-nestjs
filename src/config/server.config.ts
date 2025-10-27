import { registerAs } from '@nestjs/config';

export default registerAs(
  'server',
  (): Record<string, any> => ({
    port: `${process.env.PORT}`,
  }),
);
