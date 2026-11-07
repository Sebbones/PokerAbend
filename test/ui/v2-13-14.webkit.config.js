import base from '../../playwright.config.js';
import {fileURLToPath} from 'node:url';
const {channel, ...use} = base.use;
export default {
  ...base, use, testDir:fileURLToPath(new URL('./',import.meta.url)), testMatch:'v2-13-14.spec.js',
  projects:[{name:'webkit',use:{browserName:'webkit',viewport:{width:1440,height:900}}}],
};
