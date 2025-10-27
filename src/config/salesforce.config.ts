import { registerAs } from '@nestjs/config';

export default registerAs(
  'salesforce',
  (): Record<string, any> => ({
    uri: `${process.env.BASESALESFORCEURL}`,
  }),
);
