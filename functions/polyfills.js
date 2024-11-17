import { Buffer } from 'buffer';
import { Readable, Writable, Transform } from 'stream-browserify';
import { inherits } from 'util';

export { Buffer, Readable, Writable, Transform, inherits };

export const process = {
  env: { NODE_ENV: 'production' },
};